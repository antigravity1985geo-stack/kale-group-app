import { createClient } from '@supabase/supabase-js';

// Vite statically replaces `import.meta.env.VITE_*` during build.
// Using dynamic keys like `import.meta.env[key]` breaks the bundler and results in undefined.
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL
  ? import.meta.env.VITE_SUPABASE_URL
  // @ts-ignore
  : (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : '');

const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  // @ts-ignore
  : (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : '');

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
