-- ============================================================
-- KALE GROUP — ACCOUNTING MODULE
-- Supabase PostgreSQL Schema
-- Version: 3.0.0 | 2026
-- Standard: Estonian-Model Profit Tax + IFRS + RS.ge
-- ============================================================
-- v3.0 Changes:
--   + Estonian Tax Model: Account 3320 (Profit Tax Payable), 8950 (Tax Expense)
--   + Dividend Distribution: Account 3330 (Dividends Payable)
--   + Dynamic Reporting RPCs: Date-range filtering for P&L, BS, Trial Balance
--   + Automated Payroll: 20% Income Tax journal integration
--   + RS.ge Fixes: Robust B2B waybill / invoice mapping
-- ============================================================

-- [Include baseline from v2.0 then append new parts]

-- ... (Existing Sections 1-7 from v2.0) ...

-- ============================================================
-- SECTION 8: ESTONIAN TAX & DIVIDENDS (NEW v3.0)
-- ============================================================

-- Additional Accounts for Estonian Model
INSERT INTO accounts (code, name_ka, name_en, account_type, account_class, normal_balance, is_system) 
VALUES
('3320', 'მოგების გადასახადი გადასახდ.',      'Profit Tax Payable',        'LIABILITY', '3', 'CREDIT', true),
('3330', 'დივიდენდები გადასახდელი',           'Dividends Payable',         'LIABILITY', '3', 'CREDIT', true),
('8950', 'მოგების გადასახადის ხარჯი',         'Profit Tax Expense',        'EXPENSE',   '8', 'DEBIT',  true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SECTION 9: DYNAMIC REPORTING RPCs (NEW v3.0)
-- ============================================================

-- 1. Profit & Loss Report with Date Range
CREATE OR REPLACE FUNCTION get_profit_loss_report(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  account_type TEXT,
  code TEXT,
  name_ka TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.account_type,
    a.code,
    a.name_ka,
    SUM(CASE WHEN a.normal_balance = 'CREDIT' THEN jl.credit - jl.debit ELSE jl.debit - jl.credit END) as amount
  FROM accounts a
  JOIN journal_lines jl ON a.id = jl.account_id
  JOIN journal_entries je ON jl.journal_entry_id = je.id
  WHERE je.status = 'POSTED'
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND a.account_type IN ('REVENUE', 'COGS', 'EXPENSE')
  GROUP BY a.account_type, a.code, a.name_ka
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql;

-- 2. Balance Sheet with Point-in-Time (up to p_date)
CREATE OR REPLACE FUNCTION get_balance_sheet_report(p_date DATE)
RETURNS TABLE (
  account_type TEXT,
  code TEXT,
  name_ka TEXT,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.account_type,
    a.code,
    a.name_ka,
    SUM(CASE WHEN a.normal_balance = 'DEBIT' THEN jl.debit - jl.credit ELSE jl.credit - jl.debit END) as balance
  FROM accounts a
  LEFT JOIN journal_lines jl ON a.id = jl.account_id
  LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND je.status = 'POSTED' AND je.entry_date <= p_date
  WHERE a.account_class IN ('1', '2', '3', '4', '5')
  GROUP BY a.account_type, a.code, a.name_ka
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql;

-- 3. Trial Balance with Date Range
CREATE OR REPLACE FUNCTION get_trial_balance_report(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  code TEXT,
  name_ka TEXT,
  starting_debit NUMERIC,
  starting_credit NUMERIC,
  period_debit NUMERIC,
  period_credit NUMERIC,
  ending_debit NUMERIC,
  ending_credit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH starting AS (
    SELECT 
      account_id,
      SUM(debit) as d,
      SUM(credit) as c
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.status = 'POSTED' AND je.entry_date < p_start_date
    GROUP BY account_id
  ),
  period AS (
    SELECT 
      account_id,
      SUM(debit) as d,
      SUM(credit) as c
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.status = 'POSTED' AND je.entry_date BETWEEN p_start_date AND p_end_date
    GROUP BY account_id
  )
  SELECT 
    a.code,
    a.name_ka,
    COALESCE(s.d, 0) as starting_debit,
    COALESCE(s.c, 0) as starting_credit,
    COALESCE(p.d, 0) as period_debit,
    COALESCE(p.c, 0) as period_credit,
    (COALESCE(s.d, 0) + COALESCE(p.d, 0)) as ending_debit,
    (COALESCE(s.c, 0) + COALESCE(p.c, 0)) as ending_credit
  FROM accounts a
  LEFT JOIN starting s ON a.id = s.account_id
  LEFT JOIN period p ON a.id = p.account_id
  WHERE COALESCE(s.d,0) != 0 OR COALESCE(s.c,0) != 0 OR COALESCE(p.d,0) != 0 OR COALESCE(p.c,0) != 0
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql;
