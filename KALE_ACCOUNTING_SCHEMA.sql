-- ============================================================
-- KALE GROUP — ACCOUNTING MODULE
-- Supabase PostgreSQL Schema
-- Version: 1.0.0 | 2026
-- Inspired by: Oris & FINA accounting systems
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


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
  UNIQUE (period_year, period_month)
);

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


-- ============================================================
-- SECTION 2: CHART OF ACCOUNTS (ანგარიშთა გეგმა)
-- ============================================================

CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,            -- "6100"
  name_ka         TEXT NOT NULL,                   -- "გაყიდვებიდან შემოსავალი"
  name_en         TEXT,                            -- "Sales Revenue"
  account_type    TEXT NOT NULL
                    CHECK (account_type IN (
                      'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS'
                    )),
  account_class   TEXT NOT NULL
                    CHECK (account_class IN ('1','2','3','4','5','6','7','8')),
  normal_balance  TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  parent_id       UUID REFERENCES accounts(id),
  is_active       BOOLEAN DEFAULT TRUE,
  is_system       BOOLEAN DEFAULT FALSE,           -- სისტემური ანგ. (არ წაიშლება)
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

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
('1400', 'ДДС (დღგ) ჩასათვლელი',             'VAT Receivable',            'ASSET',     '1', 'DEBIT',  true),
('1900', 'სხვა მიმდ. აქტივები',               'Other Current Assets',      'ASSET',     '1', 'DEBIT',  false);

-- CLASS 2: Non-Current Assets
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) VALUES
('2100', 'ძირითადი საშუალებები',              'Fixed Assets',              'ASSET',     '2', 'DEBIT',  false),
('2110', 'საოფისე ტექნიკა',                   'Office Equipment',          'ASSET',     '2', 'DEBIT',  false),
('2120', 'სატრანსპ. საშ.',                    'Vehicles',                  'ASSET',     '2', 'DEBIT',  false),
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
  reference_id     UUID,                           -- FK to source document
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
  -- ერთი line-ი ან debit-ია ან credit-ი
  CONSTRAINT chk_debit_xor_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

-- Auto journal entry number sequence
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

-- Balanced journal constraint (ჟ. ბალანსი)
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit  NUMERIC;
  v_total_credit NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(debit),  0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced: Debit=% Credit=%',
      v_total_debit, v_total_credit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires only when entry is POSTED
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
      RAISE EXCEPTION 'Cannot post unbalanced journal entry. Debit=%, Credit=%', v_debit, v_credit;
    END IF;
    -- Cannot post in locked period
    IF EXISTS (
      SELECT 1 FROM fiscal_periods
      WHERE id = NEW.fiscal_period_id AND status = 'LOCKED'
    ) THEN
      RAISE EXCEPTION 'Fiscal period is LOCKED. Cannot post journal entry.';
    END IF;
    NEW.posted_at := NOW();
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
  invoice_number    TEXT NOT NULL UNIQUE,          -- "INV-2026-000001" / "EINV-..."
  invoice_type      TEXT NOT NULL DEFAULT 'B2C'
                      CHECK (invoice_type IN ('B2C', 'B2B', 'REFUND', 'PROFORMA')),
  invoice_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  -- Customer
  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  customer_phone    TEXT,
  customer_tin      TEXT,                          -- სს/კ (B2B-ისთვის)
  customer_address  TEXT,
  -- Order link
  order_id          UUID,                          -- FK to orders table
  -- Amounts
  subtotal          NUMERIC(18,2) NOT NULL,        -- ДДС-ს გარეშე
  vat_rate          NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  vat_amount        NUMERIC(18,2) NOT NULL,
  total_amount      NUMERIC(18,2) NOT NULL,        -- ДДС-ით
  discount_amount   NUMERIC(18,2) DEFAULT 0,
  -- Currency
  currency          TEXT NOT NULL DEFAULT 'GEL',
  exchange_rate     NUMERIC(10,6) DEFAULT 1.0,
  -- Payment
  payment_method    TEXT CHECK (payment_method IN ('CARD_BOG','CARD_TBC','CREDO','CASH','BANK_TRANSFER')),
  payment_status    TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (payment_status IN ('PENDING','PARTIAL','PAID','OVERDUE','CANCELLED','REFUNDED')),
  paid_amount       NUMERIC(18,2) DEFAULT 0,
  paid_at           TIMESTAMPTZ,
  -- RS.ge
  rsge_status       TEXT CHECK (rsge_status IN ('NOT_SENT','SENT','CONFIRMED','CANCELLED')),
  rsge_invoice_id   TEXT,                          -- RS.ge-ს დაბრ. ID
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

CREATE TABLE invoice_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id       UUID,                           -- FK to products
  product_name     TEXT NOT NULL,
  product_sku      TEXT,
  quantity         NUMERIC(10,2) NOT NULL,
  unit_price       NUMERIC(18,2) NOT NULL,         -- ДДС-ს გარეშე
  vat_rate         NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  vat_amount       NUMERIC(18,2) NOT NULL,
  line_total       NUMERIC(18,2) NOT NULL,         -- ДДС-ით
  cost_price       NUMERIC(18,2),                  -- COGS-ისთვის
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice number auto-generation
CREATE SEQUENCE invoice_b2c_seq  START 1;
CREATE SEQUENCE invoice_b2b_seq  START 1;
CREATE SEQUENCE invoice_ref_seq  START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_type = 'B2C' THEN
    NEW.invoice_number := 'INV-'  || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_b2c_seq')::TEXT, 6, '0');
  ELSIF NEW.invoice_type = 'B2B' THEN
    NEW.invoice_number := 'EINV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_b2b_seq')::TEXT, 6, '0');
  ELSIF NEW.invoice_type = 'REFUND' THEN
    NEW.invoice_number := 'REF-'  || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('invoice_ref_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();


-- ============================================================
-- SECTION 5: SUPPLIERS & PURCHASE ORDERS
-- ============================================================

CREATE TABLE suppliers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code    TEXT NOT NULL UNIQUE,           -- "SUP-001"
  name             TEXT NOT NULL,
  tin              TEXT,                           -- სს/კ
  contact_person   TEXT,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  country          TEXT DEFAULT 'GE',
  payment_terms    INTEGER DEFAULT 30,             -- days
  currency         TEXT DEFAULT 'GEL',
  account_id       UUID REFERENCES accounts(id),   -- 3100
  is_active        BOOLEAN DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number        TEXT NOT NULL UNIQUE,           -- "PO-2026-000001"
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date    DATE,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN (
                       'DRAFT','SENT','PARTIALLY_RECEIVED','FULLY_RECEIVED','INVOICED','PAID','CANCELLED'
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

CREATE TABLE purchase_order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id            UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id       UUID,
  product_name     TEXT NOT NULL,
  product_sku      TEXT,
  quantity_ordered NUMERIC(10,2) NOT NULL,
  quantity_received NUMERIC(10,2) DEFAULT 0,
  unit_cost        NUMERIC(18,2) NOT NULL,
  vat_rate         NUMERIC(5,2)  DEFAULT 18.00,
  vat_amount       NUMERIC(18,2) NOT NULL,
  line_total       NUMERIC(18,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sinv_number       TEXT NOT NULL,                -- "SINV-2026-000001"
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
  rsge_invoice_id   TEXT,                         -- RS.ge-ზე Input VAT-ისთვის
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE po_seq   START 1;
CREATE SEQUENCE sinv_seq START 1;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('po_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION generate_po_number();


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
  unit_cost        NUMERIC(18,2),                 -- FIFO layer cost
  total_cost       NUMERIC(18,2),
  reference_type   TEXT,
  reference_id     UUID,                           -- FK to invoice / po
  journal_entry_id UUID REFERENCES journal_entries(id),
  fiscal_period_id UUID REFERENCES fiscal_periods(id),
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- FIFO Cost Layers
CREATE TABLE inventory_cost_layers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL,
  po_id            UUID REFERENCES purchase_orders(id),
  purchase_date    DATE NOT NULL,
  quantity_original NUMERIC(10,2) NOT NULL,
  quantity_remaining NUMERIC(10,2) NOT NULL,       -- decreases on SALE_OUT
  unit_cost        NUMERIC(18,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Current stock levels (denormalized for speed)
CREATE TABLE stock_levels (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL UNIQUE,
  quantity_on_hand NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(10,2) NOT NULL DEFAULT 0,  -- pending orders
  quantity_available NUMERIC(10,2) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  avg_cost         NUMERIC(18,2) DEFAULT 0,            -- weighted average cost
  total_cost_value NUMERIC(18,2) DEFAULT 0,
  reorder_point    NUMERIC(10,2) DEFAULT 5,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 7: VAT TRANSACTIONS (ДДС / დღგ)
-- ============================================================

CREATE TABLE vat_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vat_type         TEXT NOT NULL CHECK (vat_type IN ('OUTPUT', 'INPUT')),
  transaction_date DATE NOT NULL,
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id),
  reference_type   TEXT CHECK (reference_type IN ('INVOICE','SUPPLIER_INVOICE','ADJUSTMENT')),
  reference_id     UUID,
  taxable_amount   NUMERIC(18,2) NOT NULL,         -- ДДС-ს გარეშე
  vat_rate         NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  vat_amount       NUMERIC(18,2) NOT NULL,
  counterparty_tin TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly VAT Declaration summary
CREATE TABLE vat_declarations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id) UNIQUE,
  output_taxable   NUMERIC(18,2) NOT NULL DEFAULT 0,  -- გამოყვ. ДДС-ს ბ-სი
  output_vat       NUMERIC(18,2) NOT NULL DEFAULT 0,  -- გამოყვ. ДДС
  input_taxable    NUMERIC(18,2) NOT NULL DEFAULT 0,  -- შეყვ. ДДС-ს ბ-სი
  input_vat        NUMERIC(18,2) NOT NULL DEFAULT 0,  -- შეყვ. ДДС
  net_vat_payable  NUMERIC(18,2) GENERATED ALWAYS AS (output_vat - input_vat) STORED,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT','SUBMITTED','ACCEPTED','REJECTED')),
  submitted_at     TIMESTAMPTZ,
  rsge_reference   TEXT,                          -- RS.ge confirmation code
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 8: CURRENCY EXCHANGE RATES
-- ============================================================

CREATE TABLE exchange_rates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_date        DATE NOT NULL,
  currency         TEXT NOT NULL CHECK (currency IN ('USD','EUR','GBP','TRY')),
  rate_to_gel      NUMERIC(10,6) NOT NULL,         -- 1 USD = X GEL
  source           TEXT DEFAULT 'NBG',             -- ეროვ. ბანკი
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
  personal_id      TEXT,                           -- პირ. ნომ.
  position         TEXT NOT NULL,
  department       TEXT CHECK (department IN ('SALES','ADMIN','LOGISTICS','IT','MANAGEMENT')),
  gross_salary     NUMERIC(18,2) NOT NULL,
  hire_date        DATE NOT NULL,
  termination_date DATE,
  status           TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  bank_account     TEXT,
  email            TEXT,
  phone            TEXT,
  photo_url        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

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
  total_net        NUMERIC(18,2) NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES journal_entries(id),
  processed_by     UUID REFERENCES auth.users(id),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id   UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES employees(id),
  gross_salary     NUMERIC(18,2) NOT NULL,
  income_tax_rate  NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
  income_tax       NUMERIC(18,2) NOT NULL,
  net_salary       NUMERIC(18,2) NOT NULL,
  paid_date        DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 10: REPORTING VIEWS
-- ============================================================

-- Trial Balance View
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

-- P&L View (Current fiscal year)
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

-- Balance Sheet View
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

-- VAT Monthly Summary View
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

-- Accounts Receivable Aging
CREATE OR REPLACE VIEW v_ar_aging AS
SELECT
  i.customer_name,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total_amount,
  i.paid_amount,
  i.total_amount - i.paid_amount AS outstanding,
  CURRENT_DATE - i.due_date AS days_overdue,
  CASE
    WHEN CURRENT_DATE <= i.due_date             THEN 'CURRENT'
    WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30  THEN '1-30 DAYS'
    WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60 DAYS'
    WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90 DAYS'
    ELSE '90+ DAYS'
  END AS aging_bucket
FROM invoices i
WHERE i.payment_status NOT IN ('PAID','CANCELLED','REFUNDED')
ORDER BY days_overdue DESC;

-- Monthly Revenue + COGS + Gross Profit Summary
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  EXTRACT(YEAR FROM je.entry_date)  AS year,
  EXTRACT(MONTH FROM je.entry_date) AS month,
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


-- ============================================================
-- SECTION 11: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE accounts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_declarations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items          ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY accounting_admin_all ON accounts
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY journal_admin ON journal_entries
  USING (auth.jwt() ->> 'role' IN ('admin', 'accountant'));

CREATE POLICY invoices_read ON invoices
  USING (auth.jwt() ->> 'role' IN ('admin', 'accountant', 'consultant'));

CREATE POLICY invoices_write ON invoices
  AS PERMISSIVE FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'accountant'));

CREATE POLICY employees_admin ON employees
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY payroll_accountant ON payroll_runs
  USING (auth.jwt() ->> 'role' IN ('admin', 'accountant'));

-- Accounts: readable by all staff
CREATE POLICY accounts_read_all ON accounts
  AS PERMISSIVE FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin', 'accountant', 'consultant'));


-- ============================================================
-- SECTION 12: INDEXES
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
CREATE INDEX idx_vat_period                 ON vat_transactions(fiscal_period_id);
CREATE INDEX idx_stock_product              ON stock_levels(product_id);


-- ============================================================
-- SECTION 13: HELPER FUNCTIONS
-- ============================================================

-- Get current fiscal period
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
    ORDER BY purchase_date ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    IF layer.quantity_remaining >= v_remaining THEN
      v_cogs := v_cogs + (v_remaining * layer.unit_cost);
      v_remaining := 0;
    ELSE
      v_cogs := v_cogs + (layer.quantity_remaining * layer.unit_cost);
      v_remaining := v_remaining - layer.quantity_remaining;
    END IF;
  END LOOP;
  RETURN v_cogs;
END;
$$ LANGUAGE plpgsql;

-- Auto-create VAT transaction from invoice
CREATE OR REPLACE FUNCTION create_vat_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'PAID' AND OLD.payment_status != 'PAID' THEN
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

-- ============================================================
-- END OF SCHEMA
-- KALE GROUP Accounting Module v1.0.0
-- ============================================================
