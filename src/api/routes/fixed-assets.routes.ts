import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAccounting } from "./accounting.routes.js";

const router = Router();

const fixedAssetSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  purchase_date: z.string().min(1),
  purchase_price: z.number().positive(),
  lifespan_months: z.number().int().positive(),
});

// POST /api/fixed-assets — create a new fixed asset
router.post('/', requireAccounting, async (req: any, res) => {
  const parsed = fixedAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'არასწორი მონაცემები', details: parsed.error.issues });
  }

  const payload = {
    ...parsed.data,
    code: parsed.data.code || `FA-${Math.floor(Date.now() / 1000)}`,
    accumulated_depreciation: 0,
    status: 'ACTIVE',
  };

  const { data, error } = await supabaseAdmin
    .from('fixed_assets')
    .insert(payload)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, asset: data });
});

// POST /api/fixed-assets/depreciation — run monthly depreciation for all active assets
router.post('/depreciation', requireAccounting, async (req: any, res) => {
  try {
    // 1. Open fiscal period
    const { data: period } = await supabaseAdmin
      .from('fiscal_periods')
      .select('id')
      .eq('status', 'OPEN')
      .order('period_year', { ascending: false })
      .limit(1)
      .single();

    if (!period) return res.status(400).json({ error: 'ღია ფისკალური პერიოდი ვერ მოიძებნა' });

    // 2. Active assets with remaining depreciation
    const { data: assets } = await supabaseAdmin
      .from('fixed_assets')
      .select('*')
      .eq('status', 'ACTIVE');

    const activeAssets = (assets || []).filter(
      (a: any) => Number(a.accumulated_depreciation) < Number(a.purchase_price)
    );
    if (activeAssets.length === 0) {
      return res.status(400).json({ error: 'არ მოიძებნა ცვეთადი აქტივები' });
    }

    // 3. Calculate depreciation per asset
    let totalDepreciation = 0;
    const updates: { id: string; accumulated_depreciation: number }[] = [];
    for (const asset of activeAssets) {
      const monthly = Number(asset.purchase_price) / Number(asset.lifespan_months);
      const remaining = Number(asset.purchase_price) - Number(asset.accumulated_depreciation);
      const toDepreciate = remaining < monthly ? remaining : monthly;
      if (toDepreciate > 0) {
        totalDepreciation += toDepreciate;
        updates.push({
          id: asset.id,
          accumulated_depreciation: Number(asset.accumulated_depreciation) + toDepreciate,
        });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'ცვეთის გამოთვლა ვერ მოხერხდა' });
    }

    // 4. Fetch accounts (7400 expense, 2100 accum. depreciation)
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, code')
      .in('code', ['7400', '2100']);

    const expId = accounts?.find((a: any) => a.code === '7400')?.id;
    const accId = accounts?.find((a: any) => a.code === '2100')?.id;

    if (!expId || !accId) {
      return res.status(400).json({ error: 'ცვეთის ანგარიშები (7400/2100) კონფიგურირებული არ არის' });
    }

    // 5. Insert journal entry
    const { data: je, error: jeErr } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        entry_number: `DEP-${Math.floor(Date.now() / 1000)}`,
        entry_date: new Date().toISOString().split('T')[0],
        description: `ყოველთვიური ცვეთის დარიცხვა (${updates.length} აქტივი)`,
        reference_type: 'DEPRECIATION',
        fiscal_period_id: period.id,
        status: 'POSTED',
      })
      .select()
      .single();

    if (jeErr) return res.status(500).json({ error: jeErr.message });

    // 6. Insert journal lines
    const { error: linesErr } = await supabaseAdmin.from('journal_lines').insert([
      { journal_entry_id: je.id, account_id: expId, debit: totalDepreciation, credit: 0 },
      { journal_entry_id: je.id, account_id: accId, debit: 0, credit: totalDepreciation },
    ]);

    if (linesErr) {
      // Rollback header
      await supabaseAdmin.from('journal_entries').delete().eq('id', je.id);
      return res.status(500).json({ error: linesErr.message });
    }

    // 7. Update each asset's accumulated depreciation
    for (const upd of updates) {
      await supabaseAdmin
        .from('fixed_assets')
        .update({ accumulated_depreciation: upd.accumulated_depreciation })
        .eq('id', upd.id);
    }

    res.json({
      success: true,
      assets_depreciated: updates.length,
      total_depreciation: totalDepreciation,
      journal_entry_id: je.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ცვეთის დარიცხვა ვერ მოხერხდა' });
  }
});

export default router;
