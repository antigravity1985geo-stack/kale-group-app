-- ============================================================
-- KALE GROUP — MANUFACTURING & RETURNS MODULE
-- Extension to KALE_ACCOUNTING_SCHEMA_v2
-- ============================================================

-- 1. MANUFACTURING / RECIPES
-- ============================================================

CREATE TABLE IF NOT EXISTS production_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finished_good_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_production_recipes_updated_at
  BEFORE UPDATE ON production_recipes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES production_recipes(id) ON DELETE CASCADE,
    -- Here we link to inventory items. V2 of accounting schema uses products/stock_levels directly,
    -- so we will reference 'products' for raw materials as well, assuming 'products' has category 'მასალები'.
    raw_material_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(10, 2) NOT NULL CHECK (quantity_required > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Manufacturing
ALTER TABLE production_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY pr_select ON production_recipes FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));
CREATE POLICY pr_write ON production_recipes FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY ri_select ON recipe_ingredients FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));
CREATE POLICY ri_write ON recipe_ingredients FOR ALL USING (current_user_role() IN ('admin','accountant'));


-- 2. RETURNS MANAGEMENT (RMA)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    return_reason TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('RESELLABLE', 'DAMAGED', 'DEFECTIVE')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'REJECTED')),
    journal_entry_id UUID REFERENCES journal_entries(id),
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- RLS for Returns
ALTER TABLE product_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY ret_select ON product_returns FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));
CREATE POLICY ret_write ON product_returns FOR ALL USING (current_user_role() IN ('admin','accountant'));


-- 3. STORED PROCEDURES (RPCs)
-- ============================================================

-- A. Process Manufacturing (Execute Recipe)
CREATE OR REPLACE FUNCTION process_manufacturing(
  p_recipe_id UUID,
  p_quantity NUMERIC,
  p_user_id UUID,
  p_notes TEXT DEFAULT 'წარმოების პროცესი'
) RETURNS VOID AS $$
DECLARE
  v_finished_good_id UUID;
  v_ingredient RECORD;
  v_total_cost NUMERIC := 0;
  v_material_cost NUMERIC;
BEGIN
  -- 1. Get finished good ID
  SELECT finished_good_id INTO v_finished_good_id 
  FROM production_recipes WHERE id = p_recipe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe not found';
  END IF;

  -- 2. Loop through ingredients and deduct stock
  FOR v_ingredient IN 
    SELECT raw_material_id, quantity_required 
    FROM recipe_ingredients WHERE recipe_id = p_recipe_id
  LOOP
    -- Calculate total required
    DECLARE
        v_req NUMERIC := v_ingredient.quantity_required * p_quantity;
        v_available NUMERIC;
        v_avg_cost NUMERIC;
    BEGIN
        SELECT quantity_available, avg_cost INTO v_available, v_avg_cost
        FROM stock_levels WHERE product_id = v_ingredient.raw_material_id;

        IF v_available IS NULL OR v_available < v_req THEN
            RAISE EXCEPTION 'Not enough stock for material %', v_ingredient.raw_material_id;
        END IF;

        v_material_cost := COALESCE(v_avg_cost, 0) * v_req;
        v_total_cost := v_total_cost + v_material_cost;

        -- Record raw material deduction
        INSERT INTO inventory_transactions (
            product_id, transaction_type, quantity, unit_cost, total_cost, reference_type, notes, created_by
        ) VALUES (
            v_ingredient.raw_material_id, 'SALE_OUT', v_req, v_avg_cost, v_material_cost, 'MANUFACTURING', 
            'მოხმარდა წარმოებას: ' || p_notes, p_user_id
        );
    END;
  END LOOP;

  -- 3. Record Finished Good Addition
  DECLARE
     v_unit_cost NUMERIC := v_total_cost / p_quantity;
  BEGIN
      INSERT INTO inventory_transactions (
          product_id, transaction_type, quantity, unit_cost, total_cost, reference_type, notes, created_by
      ) VALUES (
          v_finished_good_id, 'PURCHASE_IN', p_quantity, v_unit_cost, v_total_cost, 'MANUFACTURING',
          'წარმოებული პროდუქცია: ' || p_notes, p_user_id
      );
  END;
END;
$$ LANGUAGE plpgsql;


-- B. Process Return (Double-Entry + Stock)
CREATE OR REPLACE FUNCTION process_return(
  p_return_id UUID,
  p_user_id UUID,
  p_fiscal_period_id UUID
) RETURNS VOID AS $$
DECLARE
  v_return RECORD;
  v_je_id UUID;
  v_subtotal NUMERIC;
  v_vat NUMERIC;
  v_total NUMERIC;
  v_cogs NUMERIC;
BEGIN
  -- 1. Get return details
  SELECT pr.*, oi.price, oi.quantity as order_qty INTO v_return
  FROM product_returns pr
  JOIN order_items oi ON oi.order_id = pr.order_id AND oi.product_id = pr.product_id
  WHERE pr.id = p_return_id AND pr.status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending return not found or mismatch';
  END IF;

  -- Refund calculations (assuming 18% VAT included in price)
  v_total := v_return.price * v_return.quantity;
  v_vat := ROUND(v_total * 18 / 118, 2);
  v_subtotal := v_total - v_vat;
  
  -- Assuming average cost from stock_levels for COGS reversal
  SELECT COALESCE(avg_cost, 0) * v_return.quantity INTO v_cogs
  FROM stock_levels WHERE product_id = v_return.product_id;

  -- 2. Create Journal Entry (Reversing Sales & COGS)
  INSERT INTO journal_entries (entry_date, description, reference_type, reference_id, fiscal_period_id, created_by)
  VALUES (CURRENT_DATE, 'პროდუქციის დაბრუნება: ' || v_return.return_reason, 'ADJUSTMENT', p_return_id, p_fiscal_period_id, p_user_id)
  RETURNING id INTO v_je_id;

  -- DR 6100 Sales Returns (Debit Revenue)
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
  SELECT v_je_id, id, v_subtotal, 0, 'გაყიდვის დაბრუნება' FROM accounts WHERE code = '6100';

  -- DR 3200 VAT Payable (Reversing Output VAT)
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
  SELECT v_je_id, id, v_vat, 0, 'დაბრუნების დღგ' FROM accounts WHERE code = '3200';

  -- CR 1200 / 1100 (Reversing Accounts Receivable / Cash)
  -- For simplicity we use 1200 Accounts Receivable / Customer refunds
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
  SELECT v_je_id, id, 0, v_total, 'დაბრუნებული თანხა/აუთვისებელი დავალიანება' FROM accounts WHERE code = '1200';

  IF v_return.condition = 'RESELLABLE' THEN
      -- Restock Inventory (DR 1310, CR 7100)
      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
      SELECT v_je_id, id, v_cogs, 0, 'საწყობში აღდგენა' FROM accounts WHERE code = '1310';
      
      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
      SELECT v_je_id, id, 0, v_cogs, 'თვითღირებულების ჩამოწერის აღდგენა' FROM accounts WHERE code = '7100';

      -- Add back to inventory_transactions
      INSERT INTO inventory_transactions (
          product_id, transaction_type, quantity, unit_cost, total_cost, reference_type, reference_id, journal_entry_id, created_by
      ) VALUES (
          v_return.product_id, 'RETURN_IN', v_return.quantity, (v_cogs / v_return.quantity), v_cogs, 'RETURN', p_return_id, v_je_id, p_user_id
      );
  END IF;

  -- 3. Mark return processed
  UPDATE product_returns 
  SET status = 'PROCESSED', processed_at = NOW(), processed_by = p_user_id, journal_entry_id = v_je_id
  WHERE id = p_return_id;

END;
$$ LANGUAGE plpgsql;
