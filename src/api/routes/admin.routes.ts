import { Router } from "express";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { autoCreateAndSendEInvoice } from '../../services/rsge/rsge.service.js';

const router = Router();

// Require admin for all routes in this file
router.use(requireAuth, requireAdmin);

// ── Admin: Invite Consultant ──
router.post("/invite", async (req: any, res) => {
  try {
    const { email, role = 'consultant' } = req.body;
    if (!email) return res.status(400).json({ error: "ელ. ფოსტა სავალდებულოა" });

    // Check if email is already registered
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: "ეს ელ. ფოსტა უკვე დარეგისტრირებულია სისტემაში" });
    }

    // Check if invitation already exists  
    const { data: existingInvite } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return res.status(400).json({ error: "ამ ელ. ფოსტაზე უკვე გაგზავნილია მოწვევა" });
    }

    // Create invitation record
    const { error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        role: role || 'consultant',
        invited_by: req.user.id,
      });

    if (inviteError) throw inviteError;

    // Try to send Supabase Auth invite email
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { role: role || 'consultant', invited_by: req.user.id },
        redirectTo: `${process.env.APP_URL || `${req.protocol}://${req.get('host')}`}/admin`,
      });
      
      if (authError) {
        console.error("Auth invite error:", authError.message);
      }
    } else {
      console.warn("SUPABASE_SERVICE_ROLE_KEY not set - invitation record created but email not sent");
    }

    res.json({ 
      success: true, 
      message: `მოწვევა გაიგზავნა: ${email}` 
    });
  } catch (error: any) {
    console.error("Invite Error:", error);
    res.status(500).json({ error: error.message || "მოწვევის გაგზავნა ვერ მოხერხდა" });
  }
});

// ── Admin: List consultants ──
router.get("/consultants", async (req: any, res) => {
  try {
    const [profilesRes, invitationsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').in('role', ['admin', 'consultant']).order('created_at', { ascending: false }),
      supabaseAdmin.from('invitations').select('*').order('created_at', { ascending: false }),
    ]);

    res.json({
      profiles: profilesRes.data || [],
      invitations: invitationsRes.data || [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "მონაცემების მიღება ვერ მოხერხდა" });
  }
});

// ── Admin: Delete Invitation ──
router.delete("/invitations/:id", async (req: any, res) => {
  try {
    const { error } = await supabaseAdmin.from('invitations').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "მოწვევის წაშლა ვერ მოხერხდა" });
  }
});

// Admin: RS.GE ინვოისის ხელახლა გაგზავნა
router.post("/rs/reinvoice/:orderId", async (req: any, res) => {
  try {
    const invoice = await supabaseAdmin.from('invoices').select('id').eq('order_id', req.params.orderId).single();
    if (!invoice.data?.id) return res.status(404).json({ error: 'ინვოისი ვერ მოიძებნა' });
    const result = await autoCreateAndSendEInvoice(req.params.orderId, invoice.data.id);
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
