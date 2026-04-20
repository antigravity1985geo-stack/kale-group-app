import { supabase, supabaseAdmin } from '../services/supabase.service.js';

// Helper: Extract user from Authorization header
export const getUserFromToken = async (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

// Helper: Check if user is admin
export const isUserAdmin = async (userId: string) => {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin';
};

// Optional: Express middleware wrapper for requireAuth
export const requireAuth = async (req: any, res: any, next: any) => {
  const user = await getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  }
  req.user = user;
  next();
};

// Optional: Express middleware wrapper for requireAdmin
export const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'არაავტორიზებული მოთხოვნა' });
  }
  const isAdmin = await isUserAdmin(req.user.id);
  if (!isAdmin) {
    return res.status(403).json({ error: 'წვდომა შეზღუდულია. საჭიროა ადმინისტრატორის უფლებები.' });
  }
  next();
};
