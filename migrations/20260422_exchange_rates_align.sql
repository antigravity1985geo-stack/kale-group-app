ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'NBG',
  ADD COLUMN IF NOT EXISTS effective_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_currency_date
  ON public.exchange_rates(currency, effective_date);

-- RLS: anyone can read, only service_role can write (fetcher runs server-side)
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_rates" ON public.exchange_rates;
CREATE POLICY "public_read_rates" ON public.exchange_rates
  FOR SELECT USING (true);
