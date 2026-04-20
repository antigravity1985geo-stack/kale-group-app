import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

let supabase: any = null;
let supabaseAdmin: any = null;

try {
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
  }
  
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  } else if (process.env.VITE_SUPABASE_URL) {
    console.error("[CRITICAL] SUPABASE_SERVICE_ROLE_KEY is not set! supabaseAdmin will be null. All admin operations will fail.");
  }
} catch (err) {
  console.error("Failed to initialize Supabase clients:", err);
}

export { supabase, supabaseAdmin };
