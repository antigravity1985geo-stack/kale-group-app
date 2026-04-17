-- ============================================================
-- KALE GROUP — ACCOUNTING MODULE
-- Supabase PostgreSQL Schema
-- Version: 2.0.0 | 2026
-- Inspired by: Oris & FINA accounting systems
-- Standard: IFRS (IFRS) + Georgian Tax Code
-- ============================================================
-- v2.0 Changes:
--   + Full RLS policies for ALL tables
--   + Social insurance (2%) in payroll
--   + stock_levels auto-sync trigger
--   + Account 1330 (Transport Cost) added
--   + updated_at auto-triggers for all tables
--   + v_ar_aging NULL due_date fix
--   + audit_log table
--   + goods_receipts table (3-way matching)
--   + v_cash_flow view
--   + sinv_number UNIQUE + auto-generation
--   + check_journal_balance dead code removed / properly wired
--   + GRANT statements for service_role
--   + fiscal_periods helper for new years
--   + payroll_runs auto-code trigger
--   + Invoice amount consistency trigger
--   + VAT trigger skips PROFORMA/REFUNDED
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- UTILITY: updated_at auto-trigger function (shared)
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SECTION 1: FISCAL PERIODS (საანგარიშო პერიოდები)
-- ============================================================

CREATE TABLE fiscal_periods (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,                    -- "2026 - იანვარი"
  period_year   INTEGER NOT NULL,
  period_month  INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'OPEN'
                  CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED')),
  closed_by     UUID REFERENCES auth.users(id),
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_year, period_month)
);

CREATE TRIGGER trg_fiscal_periods_updated_at
  BEFORE UPDATE ON fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-seed current year periods
INSERT INTO fiscal_periods (name, period_year, period_month, start_date, end_date)
SELECT
  to_char(make_date(2026, m, 1), 'YYYY') || ' - ' ||
    CASE m
      WHEN 1  THEN 'იანვარი'
      WHEN 2  THEN 'თებერვალი'
      WHEN 3  THEN 'მარტი'
      WHEN 4  THEN 'აპრილი'
      WHEN 5  THEN 'მაისი'
      WHEN 6  THEN 'ივნისი'
      WHEN 7  THEN 'ივლისი'
      WHEN 8  THEN 'აგვისტო'
      WHEN 9  THEN 'სექტემბერი'
      WHEN 10 THEN 'ოქტომბერი'
      WHEN 11 THEN 'ნოემბერი'
      WHEN 12 THEN 'დეკემბერი'
    END,
  2026, m,
  make_date(2026, m, 1),
  (make_date(2026, m, 1) + INTERVAL '1 month - 1 day')::DATE
FROM generate_series(1, 12) AS m;

-- FIX: Reusable helper for seeding any year's fiscal periods
CREATE OR REPLACE FUNCTION seed_fiscal_year(p_year INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO fiscal_periods (name, period_year, period_month, start_date, end_date)
  SELECT
    p_year::TEXT || ' - ' ||
      CASE m
        WHEN 1  THEN 'იანვარი'   WHEN 2  THEN 'თებერვალი'
        WHEN 3  THEN 'მარტი'     WHEN 4  THEN 'აპრილი'
        WHEN 5  THEN 'მაისი'     WHEN 6  THEN 'ივნისი'
        WHEN 7  THEN 'ივლისი'    WHEN 8  THEN 'აგვისტო'
        WHEN 9  THEN 'სექტემბერი' WHEN 10 THEN 'ოქტომბერი'
        WHEN 11 THEN 'ნოემბერი'  WHEN 12 THEN 'დეკემბერი'
      END,
    p_year, m,
    make_date(p_year, m, 1),
    (make_date(p_year, m, 1) + INTERVAL '1 month - 1 day')::DATE
  FROM generate_series(1, 12) AS m
  ON CONFLICT (period_year, period_month) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SECTION 2: CHART OF ACCOUNTS (ანგარიშთა გეგმა)
-- ============================================================

CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,            -- "6100"
  name_ka         TEXT NOT NULL,
  name_en         TEXT,
  account_type    TEXT NOT NULL
                    CHECK (account_type IN (
                      'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS'
                    )),
  account_class   TEXT NOT NULL
                    CHECK (account_class IN ('1','2','3','4','5','6','7','8')),
  normal_balance  TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  parent_id       UUID REFERENCES accounts(id),
  is_active       BOOLEAN DEFAULT TRUE,
  is_system       BOOLEAN DEFAULT FALSE,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- Chart of Accounts — KALE GROUP Standard Data
-- ============================================================

-- CLASS 1: Current Assets
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('1100', 'სალარო',                            'Cash on Hand',              'ASSET',     '1', 'DEBIT',  true),
('1110', 'საბანკო ანგარიში — ლარი',           'Bank Account — GEL',        'ASSET',     '1', 'DEBIT',  true),
('1120', 'საბანკო ანგარიში — USD',            'Bank Account — USD',        'ASSET',     '1', 'DEBIT',  false),
('1130', 'საბანკო ანგარიში — EUR',            'Bank Account — EUR',        'ASSET',     '1', 'DEBIT',  false),
('1140', 'BOG ონლაინ გადახდები',              'BOG eCommerce Settlement',  'ASSET',     '1', 'DEBIT',  true),
('1150', 'TBC ონლაინ გადახდები',              'TBC eCommerce Settlement',  'ASSET',     '1', 'DEBIT',  true),
('1160', 'Credo გადახდები',                   'Credo Settlement',          'ASSET',     '1', 'DEBIT',  false),
('1200', 'დებიტორული დავალიანება',            'Accounts Receivable',       'ASSET',     '1', 'DEBIT',  true),
('1210', 'წინასწ. გადახდა მომწოდ.',           'Prepayment to Suppliers',   'ASSET',     '1', 'DEBIT',  false),
('1300', 'სასაქ.-მატ. ფასეულობები',           'Inventories',               'ASSET',     '1', 'DEBIT',  true),
('1310', 'საქონელი — ავეჯი',                  'Goods — Furniture',         'ASSET',     '1', 'DEBIT',  true),
('1320', 'მასალები / სასაფუთე',               'Materials / Packaging',     'ASSET',     '1', 'DEBIT',  false),
-- FIX: account 1330 was missing in v1.0
('1330', 'სატრანსპ. ხარჯი (თვ-ღირ.)',         'Transport Cost (Purchase)',  'ASSET',     '1', 'DEBIT',  false),
('1400', 'ДДС (დღგ) ჩასათვლელი',             'VAT Receivable',            'ASSET',     '1', 'DEBIT',  true),
('1900', 'სხვა მიმდ. აქტივები',               'Other Current Assets',      'ASSET',     '1', 'DEBIT',  false);

-- CLASS 2: Non-Current Assets
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('2100', 'ძირითადი საშუალებები',              'Fixed Assets',              'ASSET',     '2', 'DEBIT',  false),
('2110', 'საოფისე ტექნიკა',                   'Office Equipment',          'ASSET',     '2', 'DEBIT',  false),
('2120', 'სატრანსპ. საშ.',                    'Vehicles',                  'ASSET',     '2', 'DEBIT',  false),
-- NOTE: Accumulated Depreciation is a contra-asset: CREDIT normal balance is correct
('2200', 'დაგ. ამორტიზაცია',                  'Accumulated Depreciation',  'ASSET',     '2', 'CREDIT', false),
('2300', 'არამატ. აქტივები',                  'Intangible Assets',         'ASSET',     '2', 'DEBIT',  false),
('2310', 'პლ-ის ღირებ. (Website)',             'Platform / Website Cost',   'ASSET',     '2', 'DEBIT',  false);

-- CLASS 3: Current Liabilities
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('3100', 'კრედიტ. დავ. — მომწოდ.',            'Accounts Payable',          'LIABILITY', '3', 'CREDIT', true),
('3110', 'მიღ. წინ. გადახდები',               'Deferred Revenue',          'LIABILITY', '3', 'CREDIT', false),
('3200', 'ДДС (დღგ) გადასახდელი',            'VAT Payable',               'LIABILITY', '3', 'CREDIT', true),
('3300', 'ხელფ. გადასახდელი',                 'Accrued Payroll',           'LIABILITY', '3', 'CREDIT', true),
('3310', 'საშემ. გადასახ. გადასახდ.',          'Income Tax Payable',        'LIABILITY', '3', 'CREDIT', true),
-- FIX: Added social insurance payable account (2% employer contribution)
('3320', 'სოც. დ-ვა — გადასახდელი',           'Social Insurance Payable',  'LIABILITY', '3', 'CREDIT', true),
('3400', 'მოკლ. სესხები',                     'Short-term Loans',          'LIABILITY', '3', 'CREDIT', false),
('3900', 'სხვა მიმდ. ვალდ.',                  'Other Current Liabilities', 'LIABILITY', '3', 'CREDIT', false);

-- CLASS 4: Long-term Liabilities
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('4100', 'გრძ. სესხები',                      'Long-term Loans',           'LIABILITY', '4', 'CREDIT', false);

-- CLASS 5: Equity
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('5100', 'საწ. კაპიტალი',                     'Share Capital',             'EQUITY',    '5', 'CREDIT', true),
('5200', 'გაუნაწ. მოგება',                    'Retained Earnings',         'EQUITY',    '5', 'CREDIT', true),
('5300', 'მიმდ. წ. P&L',                      'Current Year P&L',          'EQUITY',    '5', 'CREDIT', true);

-- CLASS 6: Revenue
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('6100', 'გაყიდ. შემოს. — ავეჯი',             'Sales Revenue — Furniture', 'REVENUE',   '6', 'CREDIT', true),
('6110', 'გაყიდ. შემოს. — შეკვ.',             'Sales Revenue — Custom',    'REVENUE',   '6', 'CREDIT', false),
('6200', 'მიწ./სერვ. შემოსავალი',             'Delivery / Service Revenue','REVENUE',   '6', 'CREDIT', false),
('6900', 'სხვა საოპ. შემოსავალი',             'Other Operating Revenue',   'REVENUE',   '6', 'CREDIT', false);

-- CLASS 7: COGS
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('7100', 'გაყ. საქ. თვ-ღირ. (COGS)',          'Cost of Goods Sold',        'COGS',      '7', 'DEBIT',  true),
('7200', 'პირდ. მიწ. ხარჯი',                  'Direct Delivery Cost',      'COGS',      '7', 'DEBIT',  false);

-- CLASS 8: Operating Expenses
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('8100', 'ხელფ. და სოც. დ-ვა',                'Salaries & Social Ins.',    'EXPENSE',   '8', 'DEBIT',  true),
('8200', 'ქირა',                               'Rent',                      'EXPENSE',   '8', 'DEBIT',  false),
('8300', 'მარკეტინგი / რეკლ.',                'Marketing & Advertising',   'EXPENSE',   '8', 'DEBIT',  false),
('8400', 'IT / ჰოსტ. / პლ-ა',                 'IT / Hosting / Platform',   'EXPENSE',   '8', 'DEBIT',  false),
('8500', 'ბანკის საკომ-ო',                     'Bank Fees & Commissions',   'EXPENSE',   '8', 'DEBIT',  true),
('8600', 'სატრ. ხარჯი (მიწოდ.)',               'Delivery / Transport',      'EXPENSE',   '8', 'DEBIT',  false),
('8700', 'ამორტიზაცია',                        'Depreciation',              'EXPENSE',   '8', 'DEBIT',  false),
('8800', 'სხვა ადმ. ხარჯი',                   'Other Admin Expenses',      'EXPENSE',   '8', 'DEBIT',  false),
('8900', 'საგ. ჯარ. / პენ.',                  'Tax Penalties',             'EXPENSE',   '8', 'DEBIT',  false);


-- ============================================================
-- SECTION 3: JOURNAL ENTRIES (სააღრიცხვო ჟურნალი)
-- ============================================================

CREATE TABLE journal_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number     TEXT NOT NULL UNIQUE,           -- "JE-2026-000001"
  entry_date       DATE NOT NULL,
  description      TEXT NOT NULL,
  reference_type   TEXT
                     CHECK (reference_type IN (
                       'INVOICE', 'PURCHASE', 'PAYMENT', 'PAYROLL',
                       'ADJUSTMENT', 'OPENING', 'DEPRECIATION', 'MANUAL', 'VAT'
                     )),
  reference_id     UUID,
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id),
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
  reversed_by      UUID REFERENCES journal_entries(id),
  created_by       UUID REFERENCES auth.users(id),
  posted_by        UUID REFERENCES auth.users(id),
  posted_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE journal_lines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id  UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES accounts(id),
  debit             NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit            NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  currency          TEXT NOT NULL DEFAULT 'GEL' CHECK (currency IN ('GEL','USD','EUR')),
  original_amount   NUMERIC(18,2),
  exchange_rate     NUMERIC(10,6) DEFAULT 1.0,
  description       TEXT,
  cost_center       TEXT CHECK (cost_center IN (
                      'ONLINE_SALES', 'COD_SALES', 'ADMIN', 'LOGISTICS', 'MARKETING', 'IT'
                    )),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  -- Each line is either debit OR credit, not both
  CONSTRAINT chk_debit_xor_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

-- Auto journal entry number sequence
-- NOTE: sequence is global (not per-year). Year is embedded in the text prefix.
CREATE SEQUENCE journal_entry_seq START 1;

CREATE OR REPLACE FUNCTION generate_journal_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.entry_number := 'JE-' || EXTRACT(YEAR FROM NOW())::TEXT
    || '-' || LPAD(nextval('journal_entry_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_number
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  WHEN (NEW.entry_number IS NULL OR NEW.entry_number = '')
  EXECUTE FUNCTION generate_journal_number();

-- FIX: Removed orphan check_journal_balance() function (was never triggered).
-- Balance check is now ONLY in check_balance_on_post() which fires on PATCH status→POSTED.

CREATE OR REPLACE FUNCTION check_balance_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_debit  NUMERIC;
  v_credit NUMERIC;
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
    INTO v_debit, v_credit
    FROM journal_lines WHERE journal_entry_id = NEW.id;

    IF ABS(v_debit - v_credit) > 0.01 THEN
      RAISE EXCEPTION
        'Cannot post unbalanced journal entry. Debit=%, Credit=%', v_debit, v_credit;
    END IF;

    IF v_debit = 0 THEN
      RAISE EXCEPTION 'Cannot post journal entry with no lines.';
    END IF;

    -- Cannot post in a LOCKED period
    IF EXISTS (
      SELECT 1 FROM fiscal_periods
      WHERE id = NEW.fiscal_period_id AND status = 'LOCKED'
    ) THEN
      RAISE EXCEPTION 'Fiscal period is LOCKED. Cannot post journal entry.';
    END IF;

    NEW.posted_at    := NOW();
    NEW.posted_by    := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_balance_check
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION check_balance_on_post();


-- ============================================================
-- SECTION 4: INVOICES — გაყიდვის ინვოისები
-- ============================================================

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number    TEXT NOT NULL UNIQUE,
  invoice_type      TEXT NOT NULL DEFAULT 'B2C'
                      CHECK (invoice_type IN ('B2C', 'B2B', 'REFUND', 'PROFORMA')),
  invoice_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  -- Customer
  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  customer_phone    TEXT,
  customer_tin      TEXT,
  customer_address  TEXT,
  -- Order link
  order_id          UUID,
  -- Amounts
  subtotal          NUMERIC(18,2) NOT NULL,
  vat_rate          NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  vat_amount        NUMERIC(18,2) NOT NULL,
  discount_amount   NUMERIC(18,2) DEFAULT 0,
  total_amount      NUMERIC(18,2) NOT NULL,
  -- Currency
  currency          TEXT NOT NULL DEFAULT 'GEL',
  exchange_rate     NUMERIC(10,6) DEFAULT 1.0,
  -- Payment
  payment_method    TEXT CHECK (payment_method IN (
                      'CARD_BOG','CARD_TBC','CREDO','CASH','BANK_TRANSFER'
                    )),
  payment_status    TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (payment_status IN (
                        'PENDING','PARTIAL','PAID','OVERDUE','CANCELLED','REFUNDED'
                      )),
  paid_amount       NUMERIC(18,2) DEFAULT 0,
  paid_at           TIMESTAMPTZ,
  -- RS.ge
  rsge_status       TEXT CHECK (rsge_status IN (
                      'NOT_SENT','SENT','CONFIRMED','CANCELLED'
                    )),
  rsge_invoice_id   TEXT,
  rsge_sent_at      TIMESTAMPTZ,
  -- Journal
  journal_entry_id  UUID REFERENCES journal_entries(id),
  fiscal_period_id  UUID REFERENCES fiscal_periods(id),
  -- Metadata
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- FIX: Verify total_amount consistency before insert/update
CREATE OR REPLACE FUNCTION check_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_expected NUMERIC;
BEGIN
  v_expected := ROUND(NEW.subtotal + NEW.vat_amount - COALESCE(NEW.discount_amount, 0), 2);
  IF ABS(NEW.total_amount - v_expected) > 0.02 THEN
    RAISE EXCEPTION
      'Invoice total mismatch. Expected %, got %. '
      'Check: subtotal=%, vat=%, discount=%',
      v_expected, NEW.total_amount,
      NEW.subtotal, NEW.vat_amount, NEW.discount_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_totals_check
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION check_invoice_totals();

CREATE TABLE invoice_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id       UUID,
  product_name     TEXT NOT NULL,
  product_sku      TEXT,
  quantity         NUMERIC(10,2) NOT NULL,
  unit_price       NUMERIC(18,2) NOT NULL,
  vat_rate         NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  vat_amount       NUMERIC(18,2) NOT NULL,
  line_total       NUMERIC(18,2) NOT NULL,
  cost_price       NUMERIC(18,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice number auto-generation (per type)
CREATE SEQUENCE invoice_b2c_seq  START 1;
CREATE SEQUENCE invoice_b2b_seq  START 1;
CREATE SEQUENCE invoice_ref_seq  START 1;
CREATE SEQUENCE invoice_pro_seq  START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
    RETURN NEW;
  END IF;
  CASE NEW.invoice_type
    WHEN 'B2C'      THEN NEW.invoice_number := 'INV-'  || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_b2c_seq')::TEXT, 6, '0');
    WHEN 'B2B'      THEN NEW.invoice_number := 'EINV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_b2b_seq')::TEXT, 6, '0');
    WHEN 'REFUND'   THEN NEW.invoice_number := 'REF-'  || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_ref_seq')::TEXT, 6, '0');
    WHEN 'PROFORMA' THEN NEW.invoice_number := 'PRO-'  || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_pro_seq')::TEXT, 6, '0');
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();


-- ============================================================
-- SECTION 5: SUPPLIERS & PURCHASE ORDERS
-- ============================================================

CREATE TABLE suppliers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code    TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  tin              TEXT,
  contact_person   TEXT,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  country          TEXT DEFAULT 'GE',
  payment_terms    INTEGER DEFAULT 30,
  currency         TEXT DEFAULT 'GEL',
  account_id       UUID REFERENCES accounts(id),   -- points to 3100
  is_active        BOOLEAN DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number        TEXT NOT NULL UNIQUE,
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date    DATE,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN (
                       'DRAFT','SENT','PARTIALLY_RECEIVED',
                       'FULLY_RECEIVED','INVOICED','PAID','CANCELLED'
                     )),
  subtotal         NUMERIC(18,2) NOT NULL DEFAULT 0,
  vat_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'GEL',
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id             UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID,
  product_name      TEXT NOT NULL,
  product_sku       TEXT,
  quantity_ordered  NUMERIC(10,2) NOT NULL,
  quantity_received NUMERIC(10,2) DEFAULT 0,
  unit_cost         NUMERIC(18,2) NOT NULL,
  vat_rate          NUMERIC(5,2)  DEFAULT 18.00,
  vat_amount        NUMERIC(18,2) NOT NULL,
  line_total        NUMERIC(18,2) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- FIX v1: sinv_number now has UNIQUE constraint + auto-generation
  sinv_number       TEXT NOT NULL UNIQUE,
  supplier_id       UUID NOT NULL REFERENCES suppliers(id),
  po_id             UUID REFERENCES purchase_orders(id),
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  subtotal          NUMERIC(18,2) NOT NULL,
  vat_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(18,2) NOT NULL,
  currency          TEXT DEFAULT 'GEL',
  payment_status    TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (payment_status IN ('PENDING','PARTIAL','PAID','OVERDUE')),
  paid_amount       NUMERIC(18,2) DEFAULT 0,
  journal_entry_id  UUID REFERENCES journal_entries(id),
  fiscal_period_id  UUID REFERENCES fiscal_periods(id),
  rsge_invoice_id   TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_supplier_invoices_updated_at
  BEFORE UPDATE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-generate PO and supplier invoice numbers
CREATE SEQUENCE po_seq   START 1;
CREATE SEQUENCE sinv_seq START 1;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || EXTRACT(YEAR FROM NOW()) || '-'
      || LPAD(nextval('po_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION generate_po_number();

-- FIX: Added missing sinv_number auto-generation trigger
CREATE OR REPLACE FUNCTION generate_sinv_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sinv_number IS NULL OR NEW.sinv_number = '' THEN
    NEW.sinv_number := 'SINV-' || EXTRACT(YEAR FROM NEW.invoice_date) || '-'
      || LPAD(nextval('sinv_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sinv_number
  BEFORE INSERT ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION generate_sinv_number();


-- ============================================================
-- SECTION 5B: GOODS RECEIPTS (სასაქონლო ჩაბარება / 3-Way Matching)
-- FIX: New table — was missing in v1.0
-- ============================================================

CREATE TABLE goods_receipts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number       TEXT NOT NULL UNIQUE,           -- "GRN-2026-000001"
  po_id            UUID NOT NULL REFERENCES purchase_orders(id),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  receipt_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED')),
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_goods_receipts_updated_at
  BEFORE UPDATE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE goods_receipt_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id            UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id        UUID REFERENCES purchase_order_items(id),
  product_id        UUID,
  product_name      TEXT NOT NULL,
  quantity_received NUMERIC(10,2) NOT NULL,
  unit_cost         NUMERIC(18,2) NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE grn_seq START 1;

CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.grn_number IS NULL OR NEW.grn_number = '' THEN
    NEW.grn_number := 'GRN-' || EXTRACT(YEAR FROM NOW()) || '-'
      || LPAD(nextval('grn_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grn_number
  BEFORE INSERT ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION generate_grn_number();

-- When GRN is CONFIRMED → update PO quantity_received on items
CREATE OR REPLACE FUNCTION sync_po_received_on_grn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' THEN
    UPDATE purchase_order_items poi
    SET quantity_received = quantity_received + gri.quantity_received
    FROM goods_receipt_items gri
    WHERE gri.grn_id     = NEW.id
      AND gri.po_item_id = poi.id;

    -- Update PO status based on fulfilment
    UPDATE purchase_orders po
    SET status = CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM purchase_order_items
        WHERE po_id = NEW.po_id
          AND quantity_received < quantity_ordered
      ) THEN 'FULLY_RECEIVED'
      ELSE 'PARTIALLY_RECEIVED'
    END
    WHERE po.id = NEW.po_id
      AND po.status NOT IN ('PAID','CANCELLED');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_po_on_grn
  AFTER UPDATE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION sync_po_received_on_grn();


-- ============================================================
-- SECTION 6: INVENTORY (სასაწყობო / მარაგები)
-- ============================================================

CREATE TABLE inventory_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL,
  transaction_type TEXT NOT NULL
                     CHECK (transaction_type IN (
                       'PURCHASE_IN','SALE_OUT','RETURN_IN','RETURN_OUT',
                       'ADJUSTMENT_IN','ADJUSTMENT_OUT','WRITE_OFF','TRANSFER','OPENING'
                     )),
  quantity         NUMERIC(10,2) NOT NULL,
  unit_cost        NUMERIC(18,2),
  total_cost       NUMERIC(18,2),
  reference_type   TEXT,
  reference_id     UUID,
  journal_entry_id UUID REFERENCES journal_entries(id),
  fiscal_period_id UUID REFERENCES fiscal_periods(id),
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- FIFO Cost Layers
CREATE TABLE inventory_cost_layers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID NOT NULL,
  po_id               UUID REFERENCES purchase_orders(id),
  purchase_date       DATE NOT NULL,
  quantity_original   NUMERIC(10,2) NOT NULL,
  quantity_remaining  NUMERIC(10,2) NOT NULL,
  unit_cost           NUMERIC(18,2) NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_remaining_lte_original
    CHECK (quantity_remaining <= quantity_original),
  CONSTRAINT chk_remaining_gte_zero
    CHECK (quantity_remaining >= 0)
);

-- Current stock levels (denormalized for speed)
CREATE TABLE stock_levels (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID NOT NULL UNIQUE,
  quantity_on_hand    NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity_reserved   NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity_available  NUMERIC(10,2) GENERATED ALWAYS AS
                        (quantity_on_hand - quantity_reserved) STORED,
  avg_cost            NUMERIC(18,2) DEFAULT 0,
  total_cost_value    NUMERIC(18,2) DEFAULT 0,
  reorder_point       NUMERIC(10,2) DEFAULT 5,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- FIX: Auto-sync stock_levels when inventory_transactions are inserted
CREATE OR REPLACE FUNCTION sync_stock_levels()
RETURNS TRIGGER AS $$
DECLARE
  v_delta NUMERIC;
BEGIN
  -- Determine signed quantity delta
  v_delta := CASE NEW.transaction_type
    WHEN 'PURCHASE_IN'    THEN  NEW.quantity
    WHEN 'RETURN_IN'      THEN  NEW.quantity
    WHEN 'ADJUSTMENT_IN'  THEN  NEW.quantity
    WHEN 'OPENING'        THEN  NEW.quantity
    WHEN 'SALE_OUT'       THEN -NEW.quantity
    WHEN 'RETURN_OUT'     THEN -NEW.quantity
    WHEN 'ADJUSTMENT_OUT' THEN -NEW.quantity
    WHEN 'WRITE_OFF'      THEN -NEW.quantity
    ELSE 0
  END;

  INSERT INTO stock_levels (product_id, quantity_on_hand, total_cost_value, avg_cost)
  VALUES (
    NEW.product_id,
    GREATEST(0, v_delta),
    COALESCE(NEW.total_cost, 0),
    COALESCE(NEW.unit_cost, 0)
  )
  ON CONFLICT (product_id) DO UPDATE SET
    quantity_on_hand  = GREATEST(0, stock_levels.quantity_on_hand + v_delta),
    total_cost_value  = CASE
                          WHEN v_delta > 0
                          THEN stock_levels.total_cost_value + COALESCE(NEW.total_cost, 0)
                          ELSE GREATEST(0, stock_levels.total_cost_value
                                          + v_delta * stock_levels.avg_cost)
                        END,
    avg_cost          = CASE
                          WHEN (stock_levels.quantity_on_hand + v_delta) > 0
                          THEN (
                            CASE
                              WHEN v_delta > 0
                              THEN stock_levels.total_cost_value + COALESCE(NEW.total_cost, 0)
                              ELSE GREATEST(0, stock_levels.total_cost_value
                                              + v_delta * stock_levels.avg_cost)
                            END
                          ) / (stock_levels.quantity_on_hand + v_delta)
                          ELSE 0
                        END,
    updated_at        = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stock_levels
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_stock_levels();


-- ============================================================
-- SECTION 7: VAT TRANSACTIONS (ДДС / დღგ)
-- ============================================================

CREATE TABLE vat_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vat_type         TEXT NOT NULL CHECK (vat_type IN ('OUTPUT', 'INPUT')),
  transaction_date DATE NOT NULL,
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id),
  reference_type   TEXT CHECK (reference_type IN (
                     'INVOICE','SUPPLIER_INVOICE','ADJUSTMENT'
                   )),
  reference_id     UUID,
  taxable_amount   NUMERIC(18,2) NOT NULL,
  vat_rate         NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  vat_amount       NUMERIC(18,2) NOT NULL,
  counterparty_tin TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vat_declarations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id) UNIQUE,
  output_taxable   NUMERIC(18,2) NOT NULL DEFAULT 0,
  output_vat       NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_taxable    NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_vat        NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_vat_payable  NUMERIC(18,2) GENERATED ALWAYS AS (output_vat - input_vat) STORED,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT','SUBMITTED','ACCEPTED','REJECTED')),
  submitted_at     TIMESTAMPTZ,
  rsge_reference   TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_vat_declarations_updated_at
  BEFORE UPDATE ON vat_declarations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================
-- SECTION 8: CURRENCY EXCHANGE RATES
-- ============================================================

CREATE TABLE exchange_rates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_date        DATE NOT NULL,
  currency         TEXT NOT NULL CHECK (currency IN ('USD','EUR','GBP','TRY')),
  rate_to_gel      NUMERIC(10,6) NOT NULL,
  source           TEXT DEFAULT 'NBG',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rate_date, currency)
);


-- ============================================================
-- SECTION 9: EMPLOYEES & PAYROLL (HR)
-- ============================================================

CREATE TABLE employees (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code    TEXT NOT NULL UNIQUE,           -- "EMP-001"
  full_name        TEXT NOT NULL,
  personal_id      TEXT,
  position         TEXT NOT NULL,
  department       TEXT CHECK (department IN (
                     'SALES','ADMIN','LOGISTICS','IT','MANAGEMENT'
                   )),
  gross_salary     NUMERIC(18,2) NOT NULL,
  hire_date        DATE NOT NULL,
  termination_date DATE,
  status           TEXT NOT NULL DEFAULT 'ACTIVE'
                     CHECK (status IN ('ACTIVE','INACTIVE')),
  bank_account     TEXT,
  email            TEXT,
  phone            TEXT,
  photo_url        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE SEQUENCE emp_seq START 1;

CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := 'EMP-' || LPAD(nextval('emp_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emp_code
  BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION generate_employee_code();

CREATE TABLE payroll_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_code         TEXT NOT NULL UNIQUE,           -- "PR-2026-01"
  period_month     INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year      INTEGER NOT NULL,
  fiscal_period_id UUID REFERENCES fiscal_periods(id),
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT','PROCESSED','PAID')),
  total_gross      NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_tax        NUMERIC(18,2) NOT NULL DEFAULT 0,
  -- FIX: Added total_social_insurance
  total_social_ins NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_net        NUMERIC(18,2) NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES journal_entries(id),
  processed_by     UUID REFERENCES auth.users(id),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_year, period_month)
);

CREATE TRIGGER trg_payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- FIX: Auto-generate payroll run codes
CREATE OR REPLACE FUNCTION generate_payroll_run_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.run_code IS NULL OR NEW.run_code = '' THEN
    NEW.run_code := 'PR-' || NEW.period_year || '-'
      || LPAD(NEW.period_month::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payroll_run_code
  BEFORE INSERT ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION generate_payroll_run_code();

CREATE TABLE payroll_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id        UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES employees(id),
  gross_salary          NUMERIC(18,2) NOT NULL,
  income_tax_rate       NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
  income_tax            NUMERIC(18,2) NOT NULL,
  -- FIX: Added social insurance fields (2% from employer)
  social_ins_rate       NUMERIC(5,2)  NOT NULL DEFAULT 2.00,
  social_ins_amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_salary            NUMERIC(18,2) NOT NULL,  -- gross - income_tax
  paid_date             DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Computed helper: net_salary = gross - income_tax (social insurance is employer cost)
CREATE OR REPLACE FUNCTION compute_payroll_item()
RETURNS TRIGGER AS $$
BEGIN
  NEW.income_tax        := ROUND(NEW.gross_salary * NEW.income_tax_rate / 100, 2);
  NEW.social_ins_amount := ROUND(NEW.gross_salary * NEW.social_ins_rate / 100, 2);
  NEW.net_salary        := NEW.gross_salary - NEW.income_tax;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_payroll_item
  BEFORE INSERT OR UPDATE ON payroll_items
  FOR EACH ROW EXECUTE FUNCTION compute_payroll_item();


-- ============================================================
-- SECTION 10: AUDIT LOG
-- FIX: New table — was missing in v1.0 (required in Roadmap Phase 3F)
-- ============================================================

CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name   TEXT NOT NULL,
  record_id    UUID NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data     JSONB,
  new_data     JSONB,
  changed_by   UUID REFERENCES auth.users(id),
  changed_at   TIMESTAMPTZ DEFAULT NOW(),
  ip_address   INET,
  user_agent   TEXT
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger to sensitive tables
CREATE TRIGGER audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_vat_declarations
  AFTER INSERT OR UPDATE OR DELETE ON vat_declarations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payroll_runs
  AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();


-- ============================================================
-- SECTION 11: REPORTING VIEWS
-- ============================================================

-- Trial Balance
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
  a.code,
  a.name_ka,
  a.account_type,
  a.normal_balance,
  COALESCE(SUM(jl.debit),  0) AS total_debit,
  COALESCE(SUM(jl.credit), 0) AS total_credit,
  CASE a.normal_balance
    WHEN 'DEBIT'  THEN COALESCE(SUM(jl.debit),0)  - COALESCE(SUM(jl.credit),0)
    WHEN 'CREDIT' THEN COALESCE(SUM(jl.credit),0) - COALESCE(SUM(jl.debit),0)
  END AS balance
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
WHERE a.is_active = TRUE
GROUP BY a.id, a.code, a.name_ka, a.account_type, a.normal_balance
ORDER BY a.code;

-- P&L (current fiscal year)
CREATE OR REPLACE VIEW v_profit_loss AS
SELECT
  a.account_class,
  a.account_type,
  a.code,
  a.name_ka,
  CASE a.normal_balance
    WHEN 'DEBIT'  THEN COALESCE(SUM(jl.debit),0)  - COALESCE(SUM(jl.credit),0)
    WHEN 'CREDIT' THEN COALESCE(SUM(jl.credit),0) - COALESCE(SUM(jl.debit),0)
  END AS amount
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
  AND je.status = 'POSTED'
  AND EXTRACT(YEAR FROM je.entry_date) = EXTRACT(YEAR FROM NOW())
WHERE a.account_type IN ('REVENUE','EXPENSE','COGS')
GROUP BY a.id, a.code, a.name_ka, a.account_type, a.account_class, a.normal_balance
ORDER BY a.code;

-- Balance Sheet
CREATE OR REPLACE VIEW v_balance_sheet AS
SELECT
  a.account_class,
  a.account_type,
  a.code,
  a.name_ka,
  CASE a.normal_balance
    WHEN 'DEBIT'  THEN COALESCE(SUM(jl.debit),0)  - COALESCE(SUM(jl.credit),0)
    WHEN 'CREDIT' THEN COALESCE(SUM(jl.credit),0) - COALESCE(SUM(jl.debit),0)
  END AS balance
FROM accounts a
LEFT JOIN journal_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
WHERE a.account_type IN ('ASSET','LIABILITY','EQUITY')
GROUP BY a.id, a.code, a.name_ka, a.account_type, a.account_class, a.normal_balance
ORDER BY a.code;

-- VAT Monthly Summary
CREATE OR REPLACE VIEW v_vat_summary AS
SELECT
  fp.period_year,
  fp.period_month,
  fp.name AS period_name,
  COALESCE(SUM(CASE WHEN vt.vat_type = 'OUTPUT' THEN vt.vat_amount END), 0) AS output_vat,
  COALESCE(SUM(CASE WHEN vt.vat_type = 'INPUT'  THEN vt.vat_amount END), 0) AS input_vat,
  COALESCE(SUM(CASE WHEN vt.vat_type = 'OUTPUT' THEN vt.vat_amount END), 0) -
  COALESCE(SUM(CASE WHEN vt.vat_type = 'INPUT'  THEN vt.vat_amount END), 0) AS net_vat_payable
FROM fiscal_periods fp
LEFT JOIN vat_transactions vt ON vt.fiscal_period_id = fp.id
GROUP BY fp.id, fp.period_year, fp.period_month, fp.name
ORDER BY fp.period_year, fp.period_month;

-- FIX: AR Aging — NULL due_date handled (CURRENT as fallback)
CREATE OR REPLACE VIEW v_ar_aging AS
SELECT
  i.customer_name,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total_amount,
  i.paid_amount,
  i.total_amount - i.paid_amount                       AS outstanding,
  CASE WHEN i.due_date IS NULL THEN NULL
       ELSE CURRENT_DATE - i.due_date
  END                                                  AS days_overdue,
  CASE
    WHEN i.due_date IS NULL                                          THEN 'NO DUE DATE'
    WHEN CURRENT_DATE <= i.due_date                                  THEN 'CURRENT'
    WHEN CURRENT_DATE - i.due_date BETWEEN 1  AND 30                THEN '1-30 DAYS'
    WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60                THEN '31-60 DAYS'
    WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90                THEN '61-90 DAYS'
    ELSE '90+ DAYS'
  END AS aging_bucket
FROM invoices i
WHERE i.payment_status NOT IN ('PAID','CANCELLED','REFUNDED')
ORDER BY days_overdue DESC NULLS LAST;

-- Monthly Revenue + COGS + Gross Profit
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  EXTRACT(YEAR  FROM je.entry_date)::INTEGER AS year,
  EXTRACT(MONTH FROM je.entry_date)::INTEGER AS month,
  SUM(CASE WHEN a.account_class = '6' THEN jl.credit - jl.debit  ELSE 0 END) AS revenue,
  SUM(CASE WHEN a.account_class = '7' THEN jl.debit  - jl.credit ELSE 0 END) AS cogs,
  SUM(CASE WHEN a.account_class = '8' THEN jl.debit  - jl.credit ELSE 0 END) AS opex,
  SUM(CASE WHEN a.account_class = '6' THEN jl.credit - jl.debit  ELSE 0 END) -
  SUM(CASE WHEN a.account_class = '7' THEN jl.debit  - jl.credit ELSE 0 END) AS gross_profit,
  SUM(CASE WHEN a.account_class = '6' THEN jl.credit - jl.debit  ELSE 0 END) -
  SUM(CASE WHEN a.account_class = '7' THEN jl.debit  - jl.credit ELSE 0 END) -
  SUM(CASE WHEN a.account_class = '8' THEN jl.debit  - jl.credit ELSE 0 END) AS net_profit
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
JOIN accounts a ON a.id = jl.account_id
GROUP BY EXTRACT(YEAR FROM je.entry_date), EXTRACT(MONTH FROM je.entry_date)
ORDER BY year, month;

-- FIX: v_cash_flow — was missing in v1.0 (referenced in module but not in schema)
CREATE OR REPLACE VIEW v_cash_flow AS
WITH posted AS (
  SELECT jl.account_id, jl.debit, jl.credit, je.entry_date
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
),
cash_accounts AS (
  SELECT id FROM accounts
  WHERE code IN ('1100','1110','1120','1130','1140','1150','1160')
),
-- Operating: net P&L ± working capital changes
operating AS (
  SELECT
    EXTRACT(YEAR  FROM entry_date)::INTEGER AS year,
    EXTRACT(MONTH FROM entry_date)::INTEGER AS month,
    -- Revenue inflows (class 6)
    SUM(CASE WHEN a.account_class = '6' THEN credit - debit  ELSE 0 END) AS revenue_cf,
    -- COGS outflows (class 7)
    SUM(CASE WHEN a.account_class = '7' THEN -(debit - credit) ELSE 0 END) AS cogs_cf,
    -- OPEX outflows (class 8)
    SUM(CASE WHEN a.account_class = '8' THEN -(debit - credit) ELSE 0 END) AS opex_cf
  FROM posted p
  JOIN accounts a ON a.id = p.account_id
  GROUP BY year, month
),
-- Investing: fixed asset purchases (class 2 debit increases = outflow)
investing AS (
  SELECT
    EXTRACT(YEAR  FROM entry_date)::INTEGER AS year,
    EXTRACT(MONTH FROM entry_date)::INTEGER AS month,
    SUM(CASE WHEN a.account_class = '2' AND a.account_type = 'ASSET'
             THEN -(debit - credit) ELSE 0 END) AS investing_cf
  FROM posted p
  JOIN accounts a ON a.id = p.account_id
  GROUP BY year, month
),
-- Financing: loans in/out (class 3 & 4 loan accounts)
financing AS (
  SELECT
    EXTRACT(YEAR  FROM entry_date)::INTEGER AS year,
    EXTRACT(MONTH FROM entry_date)::INTEGER AS month,
    SUM(CASE WHEN a.code IN ('3400','4100')
             THEN (credit - debit) ELSE 0 END) AS financing_cf
  FROM posted p
  JOIN accounts a ON a.id = p.account_id
  GROUP BY year, month
)
SELECT
  o.year,
  o.month,
  COALESCE(o.revenue_cf,    0) + COALESCE(o.cogs_cf,  0) + COALESCE(o.opex_cf, 0) AS operating_cf,
  COALESCE(i.investing_cf,  0)                                                       AS investing_cf,
  COALESCE(f.financing_cf,  0)                                                       AS financing_cf,
  COALESCE(o.revenue_cf,    0) + COALESCE(o.cogs_cf,  0) + COALESCE(o.opex_cf, 0)
  + COALESCE(i.investing_cf,0) + COALESCE(f.financing_cf, 0)                        AS net_cf
FROM operating o
LEFT JOIN investing i USING (year, month)
LEFT JOIN financing f USING (year, month)
ORDER BY year, month;

-- Accounts Payable Aging (Suppliers)
CREATE OR REPLACE VIEW v_ap_aging AS
SELECT
  s.name                                           AS supplier_name,
  si.sinv_number,
  si.invoice_date,
  si.due_date,
  si.total_amount,
  si.paid_amount,
  si.total_amount - si.paid_amount                 AS outstanding,
  CASE WHEN si.due_date IS NULL THEN NULL
       ELSE CURRENT_DATE - si.due_date
  END                                              AS days_overdue
FROM supplier_invoices si
JOIN suppliers s ON s.id = si.supplier_id
WHERE si.payment_status NOT IN ('PAID')
ORDER BY days_overdue DESC NULLS LAST;


-- ============================================================
-- SECTION 12: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE accounts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_cost_layers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_declarations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- Helper: role checker
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role', 'guest');
$$ LANGUAGE SQL STABLE;

-- ───────────────────────────────────────────
-- accounts
-- ───────────────────────────────────────────
CREATE POLICY accounts_select ON accounts
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY accounts_insert ON accounts
  FOR INSERT WITH CHECK (current_user_role() = 'admin');

CREATE POLICY accounts_update ON accounts
  FOR UPDATE USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY accounts_delete ON accounts
  FOR DELETE USING (current_user_role() = 'admin' AND is_system = FALSE);

-- ───────────────────────────────────────────
-- journal_entries
-- ───────────────────────────────────────────
CREATE POLICY je_select ON journal_entries
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY je_insert ON journal_entries
  FOR INSERT WITH CHECK (current_user_role() IN ('admin','accountant'));

CREATE POLICY je_update ON journal_entries
  FOR UPDATE USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY je_delete ON journal_entries
  FOR DELETE USING (current_user_role() = 'admin' AND status = 'DRAFT');

-- ───────────────────────────────────────────
-- journal_lines
-- ───────────────────────────────────────────
CREATE POLICY jl_select ON journal_lines
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY jl_insert ON journal_lines
  FOR INSERT WITH CHECK (current_user_role() IN ('admin','accountant'));

CREATE POLICY jl_update ON journal_lines
  FOR UPDATE USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY jl_delete ON journal_lines
  FOR DELETE USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- invoices
-- ───────────────────────────────────────────
CREATE POLICY invoices_select ON invoices
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY invoices_insert ON invoices
  FOR INSERT WITH CHECK (current_user_role() IN ('admin','accountant'));

CREATE POLICY invoices_update ON invoices
  FOR UPDATE USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY invoices_delete ON invoices
  FOR DELETE USING (current_user_role() = 'admin' AND payment_status = 'CANCELLED');

-- ───────────────────────────────────────────
-- invoice_items
-- ───────────────────────────────────────────
CREATE POLICY ii_select ON invoice_items
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY ii_write ON invoice_items
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- suppliers
-- ───────────────────────────────────────────
CREATE POLICY sup_select ON suppliers
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY sup_write ON suppliers
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- purchase_orders + items
-- ───────────────────────────────────────────
CREATE POLICY po_select ON purchase_orders
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY po_write ON purchase_orders
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY poi_select ON purchase_order_items
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY poi_write ON purchase_order_items
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- supplier_invoices
-- ───────────────────────────────────────────
CREATE POLICY sinv_select ON supplier_invoices
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY sinv_write ON supplier_invoices
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- goods_receipts + items
-- ───────────────────────────────────────────
CREATE POLICY grn_select ON goods_receipts
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY grn_write ON goods_receipts
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY grni_select ON goods_receipt_items
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY grni_write ON goods_receipt_items
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- inventory
-- ───────────────────────────────────────────
CREATE POLICY inv_tx_select ON inventory_transactions
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY inv_tx_write ON inventory_transactions
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY inv_layers_select ON inventory_cost_layers
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY inv_layers_write ON inventory_cost_layers
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY stock_select ON stock_levels
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY stock_write ON stock_levels
  FOR ALL USING (current_user_role() = 'admin');

-- ───────────────────────────────────────────
-- VAT
-- ───────────────────────────────────────────
CREATE POLICY vat_tx_select ON vat_transactions
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY vat_tx_write ON vat_transactions
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY vat_decl_select ON vat_declarations
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY vat_decl_write ON vat_declarations
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- exchange_rates
-- ───────────────────────────────────────────
CREATE POLICY fx_select ON exchange_rates
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY fx_write ON exchange_rates
  FOR ALL USING (current_user_role() = 'admin');

-- ───────────────────────────────────────────
-- fiscal_periods
-- ───────────────────────────────────────────
CREATE POLICY fp_select ON fiscal_periods
  FOR SELECT USING (current_user_role() IN ('admin','accountant','consultant'));

CREATE POLICY fp_update ON fiscal_periods
  FOR UPDATE USING (current_user_role() = 'admin');

-- ───────────────────────────────────────────
-- employees (sensitive — admin only)
-- ───────────────────────────────────────────
CREATE POLICY emp_select ON employees
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY emp_write ON employees
  FOR ALL USING (current_user_role() = 'admin');

-- ───────────────────────────────────────────
-- payroll
-- ───────────────────────────────────────────
CREATE POLICY pr_select ON payroll_runs
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY pr_write ON payroll_runs
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY pi_select ON payroll_items
  FOR SELECT USING (current_user_role() IN ('admin','accountant'));

CREATE POLICY pi_write ON payroll_items
  FOR ALL USING (current_user_role() IN ('admin','accountant'));

-- ───────────────────────────────────────────
-- audit_log (read-only for admins)
-- ───────────────────────────────────────────
CREATE POLICY al_select ON audit_log
  FOR SELECT USING (current_user_role() = 'admin');

-- audit_log is insert-only via SECURITY DEFINER function, no direct write policy


-- ============================================================
-- SECTION 13: INDEXES
-- ============================================================

CREATE INDEX idx_journal_entries_date       ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_period     ON journal_entries(fiscal_period_id);
CREATE INDEX idx_journal_entries_status     ON journal_entries(status);
CREATE INDEX idx_journal_entries_ref        ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_journal_lines_entry        ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account      ON journal_lines(account_id);
CREATE INDEX idx_invoices_date              ON invoices(invoice_date);
CREATE INDEX idx_invoices_status            ON invoices(payment_status);
CREATE INDEX idx_invoices_order             ON invoices(order_id);
CREATE INDEX idx_inventory_product          ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_type             ON inventory_transactions(transaction_type);
CREATE INDEX idx_vat_period                 ON vat_transactions(fiscal_period_id);
CREATE INDEX idx_stock_product              ON stock_levels(product_id);
CREATE INDEX idx_cost_layers_product        ON inventory_cost_layers(product_id, purchase_date);
CREATE INDEX idx_audit_log_table            ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user             ON audit_log(changed_by);
CREATE INDEX idx_goods_receipts_po          ON goods_receipts(po_id);
CREATE INDEX idx_employees_status           ON employees(status);
CREATE INDEX idx_payroll_items_run          ON payroll_items(payroll_run_id);
CREATE INDEX idx_sinv_supplier              ON supplier_invoices(supplier_id);
CREATE INDEX idx_sinv_period                ON supplier_invoices(fiscal_period_id);


-- ============================================================
-- SECTION 14: HELPER FUNCTIONS
-- ============================================================

-- Get current (open) fiscal period UUID
CREATE OR REPLACE FUNCTION get_current_fiscal_period()
RETURNS UUID AS $$
  SELECT id FROM fiscal_periods
  WHERE period_year  = EXTRACT(YEAR  FROM CURRENT_DATE)
    AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND status = 'OPEN'
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Calculate FIFO COGS for a product sale
CREATE OR REPLACE FUNCTION calculate_fifo_cogs(
  p_product_id UUID,
  p_quantity   NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_remaining NUMERIC := p_quantity;
  v_cogs      NUMERIC := 0;
  layer       RECORD;
BEGIN
  FOR layer IN
    SELECT id, quantity_remaining, unit_cost
    FROM inventory_cost_layers
    WHERE product_id = p_product_id
      AND quantity_remaining > 0
    ORDER BY purchase_date ASC, created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    IF layer.quantity_remaining >= v_remaining THEN
      v_cogs      := v_cogs + (v_remaining * layer.unit_cost);
      -- Consume this layer partially
      UPDATE inventory_cost_layers
      SET quantity_remaining = quantity_remaining - v_remaining
      WHERE id = layer.id;
      v_remaining := 0;
    ELSE
      v_cogs      := v_cogs + (layer.quantity_remaining * layer.unit_cost);
      v_remaining := v_remaining - layer.quantity_remaining;
      -- Exhaust this layer
      UPDATE inventory_cost_layers
      SET quantity_remaining = 0
      WHERE id = layer.id;
    END IF;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE WARNING 'Insufficient FIFO layers for product %. Uncosted qty: %',
      p_product_id, v_remaining;
  END IF;

  RETURN v_cogs;
END;
$$ LANGUAGE plpgsql;

-- FIX: create_vat_from_invoice — skips PROFORMA and REFUNDED invoice types
CREATE OR REPLACE FUNCTION create_vat_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when payment transitions to PAID
  IF NEW.payment_status = 'PAID'
     AND (OLD.payment_status IS DISTINCT FROM 'PAID')
     -- Skip PROFORMA (not a real tax event) and REFUND (handled separately)
     AND NEW.invoice_type NOT IN ('PROFORMA', 'REFUND')
  THEN
    INSERT INTO vat_transactions (
      vat_type, transaction_date, fiscal_period_id,
      reference_type, reference_id,
      taxable_amount, vat_rate, vat_amount,
      counterparty_tin
    ) VALUES (
      'OUTPUT',
      NEW.invoice_date,
      COALESCE(NEW.fiscal_period_id, get_current_fiscal_period()),
      'INVOICE',
      NEW.id,
      NEW.subtotal,
      NEW.vat_rate,
      NEW.vat_amount,
      NEW.customer_tin
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vat_from_invoice
  AFTER UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION create_vat_from_invoice();

-- Auto-create VAT transaction from supplier invoice (Input VAT)
CREATE OR REPLACE FUNCTION create_vat_from_supplier_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'PAID'
     AND (OLD.payment_status IS DISTINCT FROM 'PAID')
     AND NEW.vat_amount > 0
  THEN
    INSERT INTO vat_transactions (
      vat_type, transaction_date, fiscal_period_id,
      reference_type, reference_id,
      taxable_amount, vat_rate, vat_amount,
      counterparty_tin
    ) VALUES (
      'INPUT',
      NEW.invoice_date,
      COALESCE(NEW.fiscal_period_id, get_current_fiscal_period()),
      'SUPPLIER_INVOICE',
      NEW.id,
      NEW.subtotal,
      18.00,
      NEW.vat_amount,
      (SELECT tin FROM suppliers WHERE id = NEW.supplier_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vat_from_supplier_invoice
  AFTER UPDATE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION create_vat_from_supplier_invoice();

-- VAT amount calculator helper
CREATE OR REPLACE FUNCTION calc_vat(p_total_with_vat NUMERIC, p_rate NUMERIC DEFAULT 18)
RETURNS TABLE(taxable NUMERIC, vat NUMERIC) AS $$
BEGIN
  vat     := ROUND(p_total_with_vat * p_rate / (100 + p_rate), 2);
  taxable := p_total_with_vat - vat;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Dashboard KPI helper function
CREATE OR REPLACE FUNCTION get_accounting_kpis(p_year INTEGER, p_month INTEGER)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'revenue',        COALESCE((
      SELECT SUM(jl.credit - jl.debit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
      JOIN accounts a ON a.id = jl.account_id AND a.account_class = '6'
      WHERE EXTRACT(YEAR  FROM je.entry_date) = p_year
        AND EXTRACT(MONTH FROM je.entry_date) = p_month
    ), 0),
    'cogs', COALESCE((
      SELECT SUM(jl.debit - jl.credit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
      JOIN accounts a ON a.id = jl.account_id AND a.account_class = '7'
      WHERE EXTRACT(YEAR  FROM je.entry_date) = p_year
        AND EXTRACT(MONTH FROM je.entry_date) = p_month
    ), 0),
    'opex', COALESCE((
      SELECT SUM(jl.debit - jl.credit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
      JOIN accounts a ON a.id = jl.account_id AND a.account_class = '8'
      WHERE EXTRACT(YEAR  FROM je.entry_date) = p_year
        AND EXTRACT(MONTH FROM je.entry_date) = p_month
    ), 0),
    'vat_payable', COALESCE((
      SELECT SUM(CASE WHEN vt.vat_type='OUTPUT' THEN vt.vat_amount ELSE -vt.vat_amount END)
      FROM vat_transactions vt
      JOIN fiscal_periods fp ON fp.id = vt.fiscal_period_id
      WHERE fp.period_year = p_year AND fp.period_month = p_month
    ), 0),
    'cash_balance', COALESCE((
      SELECT SUM(jl.debit - jl.credit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'POSTED'
      JOIN accounts a ON a.id = jl.account_id
      WHERE a.code IN ('1100','1110','1120','1130','1140','1150','1160')
    ), 0),
    'inventory_value', COALESCE((
      SELECT SUM(total_cost_value) FROM stock_levels
    ), 0),
    'ap_balance', COALESCE((
      SELECT SUM(total_amount - paid_amount)
      FROM supplier_invoices WHERE payment_status NOT IN ('PAID')
    ), 0),
    'ar_balance', COALESCE((
      SELECT SUM(total_amount - paid_amount)
      FROM invoices WHERE payment_status NOT IN ('PAID','CANCELLED','REFUNDED')
    ), 0)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================
-- SECTION 15: GRANTS (Supabase service_role access)
-- FIX: Missing in v1.0 — service_role needs direct table access
--      for server-side API calls (bypasses RLS)
-- ============================================================

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- authenticated role gets default RLS-filtered access
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE                          ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- anon role: no accounting access (RLS handles further restriction)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;


-- ============================================================
-- END OF SCHEMA
-- KALE GROUP Accounting Module v2.0.0
-- ============================================================
