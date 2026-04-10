-- ============================================================
-- MIGRATION: Fix POS → Accounting Integration
-- Date: 2026-04-10
-- Applied to: cjvhoadkvjqsmoiypndw (kalegorup)
-- 
-- Fixes:
--   1. Add 'SALES_ORDER' and 'PRODUCTION' to reference_type CHECK
--   2. Add 'SALES' to invoice_type CHECK
--   3. Create record_fifo_sale helper function
--   4. Rewrite process_order_sale RPC with payment_method routing:
--      - cash        → 1100 (სალარო)
--      - card        → 1150 (ბარათის სეტლმენტი)
--      - bank_transfer → 1110 (საბანკო ანგარიში)
--      - installment → 1200 (დებიტორული დავალიანება)
--   5. Fix account codes: Revenue→6100, VAT→3200, Inventory→1310, COGS→7100
-- ============================================================

-- 1. Fix reference_type CHECK constraint
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_reference_type_check 
  CHECK (reference_type IN (
    'INVOICE', 'PURCHASE', 'PAYMENT', 'PAYROLL',
    'ADJUSTMENT', 'OPENING', 'DEPRECIATION', 'MANUAL', 'VAT',
    'SALES_ORDER', 'RETURN', 'PRODUCTION'
  ));

-- 2. Fix invoice_type CHECK constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_type_check 
  CHECK (invoice_type IN ('B2C', 'B2B', 'REFUND', 'PROFORMA', 'SALES'));

-- 3. Create helper: record_fifo_sale
CREATE OR REPLACE FUNCTION record_fifo_sale(p_order_id UUID, p_je_id UUID)
RETURNS VOID AS $$
DECLARE
  v_item     RECORD;
  v_cogs     NUMERIC;
  v_inv_id   UUID;
  v_cogs_id  UUID;
  v_fp_id    UUID;
BEGIN
  SELECT id INTO v_inv_id FROM accounts WHERE code = '1310';
  SELECT id INTO v_cogs_id FROM accounts WHERE code = '7100';
  SELECT get_current_fiscal_period() INTO v_fp_id;

  IF v_inv_id IS NULL OR v_cogs_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity, oi.product_name
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    v_cogs := calculate_fifo_cogs(v_item.product_id, v_item.quantity);

    IF v_cogs > 0 THEN
      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (p_je_id, v_cogs_id, v_cogs, 0, 'COGS — ' || v_item.product_name);

      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
      VALUES (p_je_id, v_inv_id, 0, v_cogs, 'ინვენტარიდან გასვლა — ' || v_item.product_name);

      INSERT INTO inventory_transactions (
        product_id, quantity, transaction_type, unit_cost, total_cost,
        reference_type, reference_id, notes, fiscal_period_id
      ) VALUES (
        v_item.product_id, v_item.quantity, 'SALE_OUT',
        ROUND(v_cogs / NULLIF(v_item.quantity, 0), 2), v_cogs,
        'SALES_ORDER', p_order_id,
        'POS/Order fulfillment — ' || v_item.product_name,
        v_fp_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Rewrite process_order_sale with payment_method routing
CREATE OR REPLACE FUNCTION process_order_sale(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order          RECORD;
  v_fiscal         RECORD;
  v_je_id          UUID;
  v_entry_number   TEXT;
  v_net            NUMERIC;
  v_vat            NUMERIC;
  v_total          NUMERIC;
  v_debit_acc_id   UUID;
  v_revenue_id     UUID;
  v_vat_acc_id     UUID;
  v_je_count       INT;
  v_vat_enabled    BOOLEAN;
  v_payment_label  TEXT;
  v_debit_code     TEXT;
  v_cost_center    TEXT;
BEGIN
  -- 1. Check VAT setting
  SELECT (value)::boolean INTO v_vat_enabled
  FROM company_settings WHERE key = 'vat_registered';
  IF v_vat_enabled IS NULL THEN v_vat_enabled := false; END IF;

  -- 2. Fetch the order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'შეკვეთა ვერ მოიძებნა');
  END IF;

  -- 3. Check for duplicate
  SELECT COUNT(*) INTO v_je_count FROM journal_entries
  WHERE reference_id = p_order_id AND reference_type IN ('INVOICE', 'SALES_ORDER');
  IF v_je_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'ეს შეკვეთა უკვე გატარებულია ბუღალტერიაში');
  END IF;

  -- 4. Find open fiscal period
  SELECT * INTO v_fiscal FROM fiscal_periods
  WHERE status = 'OPEN' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_fiscal FROM fiscal_periods WHERE status = 'OPEN' ORDER BY start_date DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'ღია ფისკალური პერიოდი ვერ მოიძებნა');
    END IF;
  END IF;

  -- 5. Calculate amounts
  v_total := v_order.total_price;
  IF v_vat_enabled THEN
    v_net := ROUND(v_total / 1.18, 2);
    v_vat := v_total - v_net;
  ELSE
    v_net := v_total;
    v_vat := 0;
  END IF;

  -- 6. PAYMENT METHOD ROUTING
  CASE COALESCE(v_order.payment_method, 'cash')
    WHEN 'cash'          THEN v_debit_code := '1100'; v_payment_label := 'ნაღდი ფული';         v_cost_center := 'SHOWROOM_CASH';
    WHEN 'card'          THEN v_debit_code := '1150'; v_payment_label := 'საბანკო ბარათი';      v_cost_center := 'SHOWROOM_CARD';
    WHEN 'bank_transfer' THEN v_debit_code := '1110'; v_payment_label := 'საბანკო გადარიცხვა';  v_cost_center := 'SHOWROOM_BANK';
    WHEN 'installment'   THEN v_debit_code := '1200'; v_payment_label := 'განვადება';           v_cost_center := 'SHOWROOM_INSTALLMENT';
    ELSE                      v_debit_code := '1100'; v_payment_label := 'სხვა';                v_cost_center := 'SHOWROOM_OTHER';
  END CASE;

  -- 7. Get account IDs
  SELECT id INTO v_debit_acc_id FROM accounts WHERE code = v_debit_code;
  SELECT id INTO v_revenue_id  FROM accounts WHERE code = '6100';
  SELECT id INTO v_vat_acc_id  FROM accounts WHERE code = '3200';

  IF v_debit_acc_id IS NULL THEN
    SELECT id INTO v_debit_acc_id FROM accounts WHERE code = '1110';
    v_payment_label := v_payment_label || ' (fallback → ბანკი)';
  END IF;

  IF v_debit_acc_id IS NULL OR v_revenue_id IS NULL THEN
    RETURN json_build_object('success', false, 'error',
      'ბუღალტრული ანგარიშები ვერ მოიძებნა. დებიტ: ' || v_debit_code || ', შემოსავალი: 6100');
  END IF;

  -- 8. Generate entry number
  v_entry_number := 'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || SUBSTRING(p_order_id::TEXT, 1, 8);

  -- 9. Create Journal Entry
  INSERT INTO journal_entries (
    entry_number, entry_date, description, reference_type, reference_id,
    fiscal_period_id, status, created_at
  ) VALUES (
    v_entry_number, CURRENT_DATE,
    'შოურუმი — ' || v_payment_label || ' — #' || SUBSTRING(p_order_id::TEXT, 1, 8)
      || ' / ' || COALESCE(v_order.customer_first_name, '') || ' ' || COALESCE(v_order.customer_last_name, ''),
    'SALES_ORDER', p_order_id, v_fiscal.id, 'POSTED', NOW()
  ) RETURNING id INTO v_je_id;

  -- 10. Debit: payment method account
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description, cost_center)
  VALUES (v_je_id, v_debit_acc_id, v_total, 0, 'თანხის მიღება — ' || v_payment_label, v_cost_center);

  -- 11. Credit: Revenue
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description, cost_center)
  VALUES (v_je_id, v_revenue_id, 0, v_net,
    CASE WHEN v_vat_enabled THEN 'გაყიდვის შემოსავალი (დღგ-ს გარეშე)' ELSE 'გაყიდვის შემოსავალი' END,
    v_cost_center);

  -- 12. Credit: VAT
  IF v_vat_enabled AND v_vat > 0 AND v_vat_acc_id IS NOT NULL THEN
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description, cost_center)
    VALUES (v_je_id, v_vat_acc_id, 0, v_vat, 'დღგ 18%', v_cost_center);
  END IF;

  -- 13. FIFO COGS
  PERFORM record_fifo_sale(p_order_id, v_je_id);

  -- 14. Return
  RETURN json_build_object(
    'success', true,
    'journal_entry_id', v_je_id,
    'entry_number', v_entry_number,
    'total', v_total,
    'net', v_net,
    'vat', v_vat,
    'vat_enabled', v_vat_enabled,
    'payment_method', COALESCE(v_order.payment_method, 'cash'),
    'payment_label', v_payment_label,
    'debit_account', v_debit_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
