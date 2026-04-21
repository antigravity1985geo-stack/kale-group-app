import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAccounting } from "./accounting.routes.js";

const router = Router();

const returnSchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  return_reason: z.string().min(1),
  condition: z.enum(['RESELLABLE', 'DAMAGED', 'REFUSED']).default('RESELLABLE'),
});

// POST /api/returns — create a product return (admin or accountant)
router.post('/', requireAccounting, async (req: any, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin
    .from('product_returns')
    .insert([parsed.data])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, return: data });
});

export default router;
