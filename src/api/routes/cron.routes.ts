import { Router } from "express";
import { fetchAndStoreNbgRates } from "../services/nbg.service.js";

const router = Router();

// Vercel Cron invokes this with header `authorization: Bearer ${CRON_SECRET}`
router.post('/exchange-rates', async (req, res) => {
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || req.headers.authorization !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized cron' });
  }
  const result = await fetchAndStoreNbgRates();
  res.json(result);
});

export default router;
