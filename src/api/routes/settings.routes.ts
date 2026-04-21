import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { getUserFromToken } from "../middleware/auth.middleware.js";

const router = Router();

// Whitelist of settings keys that can be updated via API
const ALLOWED_KEYS = new Set([
  'vat_registered',
  'installment_surcharge_rate',
  'company_info',
]);

const KEY_DESCRIPTIONS: Record<string, string> = {
  vat_registered: 'დღგ-ს გადამხდელის სტატუსი (boolean)',
  installment_surcharge_rate: 'განვადების საკომისიოს პროცენტი (%). ნაგულისხმევად 5%',
  company_info: 'კომპანიის ზოგადი ინფორმაცია (JSONB)',
};

// Middleware: admin or accountant only
const requireSettingsAccess = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'accountant'].includes(profile.role)) {
    return res.status(403).json({ error: 'წვდომა შეზღუდულია' });
  }
  req.userId = user.id;
  next();
};

const upsertSchema = z.object({
  value: z.any(),
});

// PUT /api/settings/:key — upsert a setting value (update if exists, insert if not)
router.put('/:key', requireSettingsAccess, async (req: any, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) {
    return res.status(400).json({ error: `მიუღებელი key: ${key}` });
  }

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები' });
  }

  // Check if row exists
  const { data: existing } = await supabaseAdmin
    .from('company_settings')
    .select('id')
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .update({ value: parsed.data.value })
      .eq('key', key);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabaseAdmin
      .from('company_settings')
      .insert({
        key,
        value: parsed.data.value,
        description: KEY_DESCRIPTIONS[key] || null,
      });
    if (error) return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

export default router;
