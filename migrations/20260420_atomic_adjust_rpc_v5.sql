CREATE OR REPLACE FUNCTION public.adjust_inventory_atomic(
  p_product_id uuid,
  p_quantity numeric,
  p_transaction_type text,
  p_unit_cost numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_fiscal_period_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_direction int;
  v_tx_id uuid;
BEGIN
  IF p_transaction_type IN ('PURCHASE_IN','RETURN_IN','ADJUSTMENT_IN','OPENING') THEN
    v_direction := 1;
  ELSIF p_transaction_type IN ('SALE_OUT','ADJUSTMENT_OUT','WASTE_OUT','RETURN_OUT') THEN
    v_direction := -1;
  ELSE
    RAISE EXCEPTION 'Invalid transaction_type: %', p_transaction_type;
  END IF;

  INSERT INTO public.inventory_transactions
    (product_id, quantity, transaction_type, unit_cost, total_cost,
     reference_type, notes, fiscal_period_id, created_by)
  VALUES
    (p_product_id, p_quantity, p_transaction_type, p_unit_cost,
     CASE WHEN p_unit_cost IS NOT NULL THEN p_unit_cost * p_quantity ELSE NULL END,
     'ADJUSTMENT', p_notes, p_fiscal_period_id, p_created_by)
  RETURNING id INTO v_tx_id;

  PERFORM public.update_stock_level(p_product_id, p_quantity * v_direction);

  RETURN jsonb_build_object('transaction_id', v_tx_id, 'direction', v_direction);
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_inventory_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_atomic TO authenticated;
