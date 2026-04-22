import { Router } from "express";
import { getRateForDate } from "../services/nbg.service.js";
import { supabaseAdmin } from "../services/supabase.service.js";

const router = Router();

router.get('/rate', async (req, res) => {
  const currency = String(req.query.currency || '').toUpperCase();
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  if (!currency) return res.status(400).json({ error: 'currency required' });
  const rate = await getRateForDate(currency, date);
  if (rate === null) return res.status(404).json({ error: `No rate for ${currency} on ${date}` });
  res.json({ currency, date, rate });
});

router.get('/', async (_req, res) => {
  const { data } = await supabaseAdmin
    .from('exchange_rates')
    .select('currency, rate, quantity, effective_date')
    .order('effective_date', { ascending: false })
    .limit(30);
  res.json({ rates: data || [] });
});

export default router;
