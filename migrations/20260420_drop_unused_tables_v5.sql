-- KEPT: goods_receipts (0 rows, but referenced in code)
-- KEPT: goods_receipt_items (0 rows, but referenced in code)
-- KEPT: purchase_orders (1 rows)
-- KEPT: purchase_order_items (1 rows)
-- KEPT: rs_incoming_waybills (0 rows, referenced in code)
-- KEPT: vat_transactions (0 rows, referenced in code)
-- KEPT: recipe_ingredient_edge_bands (0 rows, referenced in code)
-- KEPT: production_waste_actuals (0 rows, referenced in code)

-- KEPT: supplier_invoices (view v_ap_aging depends on it)
DROP TABLE IF EXISTS public.vat_declarations RESTRICT;
DROP TABLE IF EXISTS public.rs_invoices RESTRICT;
DROP TABLE IF EXISTS public.rs_invoice_errors RESTRICT;
DROP TABLE IF EXISTS public.inventory_cost_layers RESTRICT;
DROP TABLE IF EXISTS public.cutting_plans RESTRICT;
