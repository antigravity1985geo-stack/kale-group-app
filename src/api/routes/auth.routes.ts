import { Router } from "express";
import { supabaseAdmin } from "../services/supabase.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Get current user's profile
router.get("/profile", requireAuth, async (req: any, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, created_at, avatar_url')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "პროფილის მიღება ვერ მოხერხდა" });
  }
});

export default router;
