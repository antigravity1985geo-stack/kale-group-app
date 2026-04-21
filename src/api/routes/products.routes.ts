import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// All product-mutation endpoints require admin
router.use(requireAuth, requireAdmin);

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string().min(1),
  material: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  delivery: z.string().optional().nullable(),
  in_stock: z.boolean().optional().default(true),
  is_on_sale: z.boolean().optional().default(false),
  discount_percentage: z.number().optional().default(0),
  sale_price: z.number().nullable().optional(),
  sale_start_date: z.string().nullable().optional(),
  sale_end_date: z.string().nullable().optional(),
  images: z.array(z.string()).optional().default([]),
  colors: z.array(z.string()).optional().default([]),
  cost_price: z.number().optional().nullable(),
}).passthrough();

// POST /api/products — create
router.post('/', async (req: any, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin.from('products').insert([parsed.data]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, product: data });
});

// PUT /api/products/:id — update full product
router.put('/:id', async (req: any, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin
    .from('products').update(parsed.data).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, product: data });
});

// PATCH /api/products/:id/stop-sale — set is_on_sale=false
router.patch('/:id/stop-sale', async (req: any, res) => {
  const { error } = await supabaseAdmin
    .from('products').update({ is_on_sale: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/products/:id
router.delete('/:id', async (req: any, res) => {
  const { error } = await supabaseAdmin.from('products').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
