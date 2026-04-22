import { supabaseAdmin } from "./supabase.service.js";

const NBG_URL = 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/';
const SUPPORTED = ['USD', 'EUR', 'RUB', 'TRY', 'GBP'];

export async function fetchAndStoreNbgRates(): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  try {
    const resp = await fetch(NBG_URL, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`NBG API ${resp.status}`);
    const payload = await resp.json();
    // payload: [{ date, currencies: [{code, rate, quantity, validFromDate, ...}] }]
    const group = Array.isArray(payload) ? payload[0] : payload;
    if (!group?.currencies) throw new Error('Unexpected NBG payload');

    const effectiveDate = (group.date || new Date().toISOString()).slice(0, 10);

    for (const row of group.currencies) {
      if (!SUPPORTED.includes(row.code)) continue;
      const { error } = await supabaseAdmin
        .from('exchange_rates')
        .upsert({
          currency: row.code,
          rate: Number(row.rate),
          quantity: Number(row.quantity) || 1,
          effective_date: effectiveDate,
          source: 'NBG',
        }, { onConflict: 'currency,effective_date' });
      if (error) { errors.push(`${row.code}: ${error.message}`); }
      else inserted++;
    }
    return { inserted, skipped, errors };
  } catch (e: any) {
    errors.push(e.message || String(e));
    return { inserted: 0, skipped: 0, errors };
  }
}

export async function getRateForDate(currency: string, date: string): Promise<number | null> {
  if (currency === 'GEL') return 1;
  const { data } = await supabaseAdmin
    .from('exchange_rates')
    .select('rate, quantity')
    .eq('currency', currency)
    .lte('effective_date', date)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return Number(data.rate) / Number(data.quantity || 1);
}
