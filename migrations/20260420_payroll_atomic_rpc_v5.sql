CREATE OR REPLACE FUNCTION public.payroll_run_atomic(
  p_period_month int,
  p_period_year int,
  p_fiscal_period_id uuid,
  p_processed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_run_code text;
  v_total_gross numeric := 0;
  v_total_tax numeric := 0;
  v_total_net numeric := 0;
  v_employee record;
  v_gross numeric;
  v_tax numeric;
  v_net numeric;
  v_je_id uuid;
  v_acc_salary_expense uuid;
  v_acc_salaries_payable uuid;
BEGIN
  -- Fetch payroll accounts
  SELECT id INTO v_acc_salary_expense FROM public.accounts WHERE code = '8100';
  SELECT id INTO v_acc_salaries_payable FROM public.accounts WHERE code = '3300';

  IF v_acc_salary_expense IS NULL OR v_acc_salaries_payable IS NULL THEN
    RAISE EXCEPTION 'Payroll accounts (8100/3300) not configured';
  END IF;

  -- Create run header
  INSERT INTO public.payroll_runs (period_month, period_year, fiscal_period_id,
    total_gross, total_tax, total_net, status, processed_by)
  VALUES (p_period_month, p_period_year, p_fiscal_period_id, 0, 0, 0, 'PROCESSED', p_processed_by)
  RETURNING id, run_code INTO v_run_id, v_run_code;

  -- Insert items per active employee
  FOR v_employee IN SELECT * FROM public.employees WHERE status = 'ACTIVE'
  LOOP
    v_gross := v_employee.gross_salary;
    v_tax := ROUND(v_gross * 0.20, 2);
    v_net := v_gross - v_tax;
    v_total_gross := v_total_gross + v_gross;
    v_total_tax := v_total_tax + v_tax;
    v_total_net := v_total_net + v_net;

    INSERT INTO public.payroll_items
      (payroll_run_id, employee_id, gross_salary, income_tax_rate, income_tax, net_salary)
    VALUES
      (v_run_id, v_employee.id, v_gross, 20, v_tax, v_net);
  END LOOP;

  IF v_total_gross = 0 THEN
    RAISE EXCEPTION 'No active employees';
  END IF;

  -- Update run totals
  UPDATE public.payroll_runs
     SET total_gross = v_total_gross, total_tax = v_total_tax, total_net = v_total_net
   WHERE id = v_run_id;

  -- Create journal entry
  INSERT INTO public.journal_entries
    (entry_date, description, reference_type, reference_id, status, fiscal_period_id)
  VALUES (CURRENT_DATE, 'Payroll Run ' || v_run_code, 'PAYROLL', v_run_id, 'POSTED', p_fiscal_period_id)
  RETURNING id INTO v_je_id;

  INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit, description)
  VALUES
    (v_je_id, v_acc_salary_expense, v_total_gross, 0, 'Salary expense'),
    (v_je_id, v_acc_salaries_payable, 0, v_total_gross, 'Salaries payable');

  RETURN jsonb_build_object(
    'run_id', v_run_id, 'run_code', v_run_code,
    'total_gross', v_total_gross, 'total_net', v_total_net
  );
END;
$$;

REVOKE ALL ON FUNCTION public.payroll_run_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payroll_run_atomic TO authenticated;
