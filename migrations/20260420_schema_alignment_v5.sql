ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accounting_status TEXT DEFAULT 'PENDING'
    CHECK (accounting_status IN ('PENDING','POSTED','FAILED')),
  ADD COLUMN IF NOT EXISTS accounting_error TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_accounting_status
  ON public.orders(accounting_status) WHERE accounting_status IN ('PENDING','FAILED');

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;
