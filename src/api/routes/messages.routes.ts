import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../services/supabase.service.js";
import { getUserFromToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware: admin or consultant can view/manage messages
const requireMessagesAccess = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'consultant'].includes(profile.role)) {
    return res.status(403).json({ error: 'წვდომა შეზღუდულია' });
  }
  req.userId = user.id;
  next();
};

const readUpdateSchema = z.object({
  read: z.boolean(),
});

// PATCH /api/messages/:id — toggle read status
router.patch('/:id', requireMessagesAccess, async (req: any, res) => {
  const parsed = readUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'არასწორი მონაცემები' });

  const { error } = await supabaseAdmin
    .from('contact_messages')
    .update({ read: parsed.data.read })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/messages/:id
router.delete('/:id', requireMessagesAccess, async (req: any, res) => {
  const { error } = await supabaseAdmin
    .from('contact_messages')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
