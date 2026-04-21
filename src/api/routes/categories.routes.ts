import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

const categorySchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
});

const updateSchema = categorySchema.extend({
  oldName: z.string().optional(),
});

// POST /api/categories — create
router.post('/', async (req: any, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin.from('categories').insert([parsed.data]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, category: data });
});

// PUT /api/categories/:id — update (with optional cascade rename on products)
router.put('/:id', async (req: any, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { oldName, ...catPayload } = parsed.data;

  const { error: catError } = await supabaseAdmin
    .from('categories').update(catPayload).eq('id', req.params.id);
  if (catError) return res.status(500).json({ error: catError.message });

  // Cascade: if name changed, update all products with old category name
  if (oldName && oldName !== catPayload.name) {
    const { error: prodError } = await supabaseAdmin
      .from('products').update({ category: catPayload.name }).eq('category', oldName);
    if (prodError) return res.status(500).json({ error: prodError.message });
  }

  res.json({ success: true });
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: any, res) => {
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
