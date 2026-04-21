import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAccounting } from "./accounting.routes.js";

const router = Router();

// ════════════════════════════════════════════
// Recipes + Ingredients
// ════════════════════════════════════════════

const ingredientSchema = z.object({
  raw_material_ref_id: z.string().uuid(),
  raw_material_id: z.string().uuid(),
  quantity_required: z.number().positive(),
  can_rotate: z.boolean().optional().default(true),
  finished_length_mm: z.number().nullable().optional(),
  finished_width_mm: z.number().nullable().optional(),
});

const recipeSchema = z.object({
  title: z.string().min(1),
  finished_good_id: z.string().uuid(),
  instructions: z.string().optional().nullable(),
  ingredients: z.array(ingredientSchema).default([]),
});

// POST /api/manufacturing/recipes — create recipe + ingredients atomically
router.post('/recipes', requireAccounting, async (req: any, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { ingredients, ...recipeData } = parsed.data;

  const { data: recipe, error: recErr } = await supabaseAdmin
    .from('production_recipes')
    .insert({ ...recipeData, created_by: req.userId })
    .select()
    .single();

  if (recErr) return res.status(500).json({ error: recErr.message });

  if (ingredients.length > 0) {
    const ings = ingredients.map((i) => ({ ...i, recipe_id: recipe.id }));
    const { error: ingErr } = await supabaseAdmin.from('recipe_ingredients').insert(ings);
    if (ingErr) {
      await supabaseAdmin.from('production_recipes').delete().eq('id', recipe.id);
      return res.status(500).json({ error: ingErr.message });
    }
  }

  res.json({ success: true, recipe });
});

// PUT /api/manufacturing/recipes/:id — update recipe + replace ingredients
router.put('/recipes/:id', requireAccounting, async (req: any, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { ingredients, ...recipeData } = parsed.data;

  const { error: recErr } = await supabaseAdmin
    .from('production_recipes')
    .update(recipeData)
    .eq('id', req.params.id);

  if (recErr) return res.status(500).json({ error: recErr.message });

  // Replace ingredients (delete old, insert new)
  const { error: delErr } = await supabaseAdmin
    .from('recipe_ingredients').delete().eq('recipe_id', req.params.id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  if (ingredients.length > 0) {
    const ings = ingredients.map((i) => ({ ...i, recipe_id: req.params.id }));
    const { error: ingErr } = await supabaseAdmin.from('recipe_ingredients').insert(ings);
    if (ingErr) return res.status(500).json({ error: ingErr.message });
  }

  res.json({ success: true });
});

// DELETE /api/manufacturing/recipes/:id
router.delete('/recipes/:id', requireAccounting, async (req: any, res) => {
  const { error } = await supabaseAdmin
    .from('production_recipes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ════════════════════════════════════════════
// Raw Materials
// ════════════════════════════════════════════

const rawMaterialSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().nonnegative().default(0),
  reorder_point: z.number().nonnegative().default(0),
  unit_cost: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
  package_unit: z.string().optional().nullable(),
  units_per_package: z.number().nullable().optional(),
});

// POST /api/manufacturing/raw-materials — create
router.post('/raw-materials', requireAccounting, async (req: any, res) => {
  const parsed = rawMaterialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin
    .from('raw_materials')
    .insert({ ...parsed.data, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, material: data });
});

// PUT /api/manufacturing/raw-materials/:id — update
router.put('/raw-materials/:id', requireAccounting, async (req: any, res) => {
  const parsed = rawMaterialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin
    .from('raw_materials').update(parsed.data).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, material: data });
});

// POST /api/manufacturing/raw-materials/bulk — bulk Excel import
const bulkImportSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().default('მ²'),
    quantity: z.number().nonnegative().default(0),
    reorder_point: z.number().nonnegative().default(5),
  })).min(1),
});

router.post('/raw-materials/bulk', requireAccounting, async (req: any, res) => {
  const parsed = bulkImportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { error } = await supabaseAdmin.from('raw_materials').insert(parsed.data.items);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, inserted: parsed.data.items.length });
});

// POST /api/manufacturing/raw-materials/purchase — atomic purchase (moving-average)
const purchaseItemSchema = z.object({
  raw_material_id: z.string().uuid(),
  input_qty: z.number().positive(),
  is_package_qty: z.boolean().optional().default(false),
  total_cost: z.number().nonnegative().optional().default(0),
});

const purchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1),
});

router.post('/raw-materials/purchase', requireAccounting, async (req: any, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  try {
    for (const item of parsed.data.items) {
      const { data: rawMat } = await supabaseAdmin
        .from('raw_materials')
        .select('*')
        .eq('id', item.raw_material_id)
        .single();

      if (!rawMat) continue;

      let addedBaseQty = item.input_qty;
      if (item.is_package_qty && rawMat.package_unit && rawMat.units_per_package) {
        addedBaseQty = item.input_qty * Number(rawMat.units_per_package);
      }

      const prevQty = parseFloat(rawMat.quantity || 0);
      const prevAvgCost = parseFloat(rawMat.unit_cost || 0);
      const addedTotalValue = item.total_cost || 0;

      let newUnitCost = prevAvgCost;
      if (addedTotalValue > 0) {
        const prevTotalValue = prevQty * prevAvgCost;
        const newTotalValue = prevTotalValue + addedTotalValue;
        const newTotalQty = prevQty + addedBaseQty;
        newUnitCost = newTotalQty > 0 ? newTotalValue / newTotalQty : prevAvgCost;
      }

      const { error: updErr } = await supabaseAdmin
        .from('raw_materials')
        .update({ quantity: prevQty + addedBaseQty, unit_cost: newUnitCost })
        .eq('id', rawMat.id);

      if (updErr) throw updErr;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'შესყიდვის გატარება ვერ მოხერხდა' });
  }
});

// ════════════════════════════════════════════
// Suppliers
// ════════════════════════════════════════════

const supplierSchema = z.object({
  name: z.string().min(1),
  tin: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  currency: z.string().optional().default('GEL'),
  notes: z.string().optional().nullable(),
}).passthrough();

// POST /api/manufacturing/suppliers — create
router.post('/suppliers', requireAccounting, async (req: any, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin
    .from('suppliers').insert(parsed.data).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, supplier: data });
});

// PUT /api/manufacturing/suppliers/:id — update
router.put('/suppliers/:id', requireAccounting, async (req: any, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const { data, error } = await supabaseAdmin
    .from('suppliers').update(parsed.data).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, supplier: data });
});

export default router;
