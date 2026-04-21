import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase.service] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.'
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabase.service] SUPABASE_SERVICE_ROLE_KEY is required (server-side only).'
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
