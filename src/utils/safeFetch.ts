import { supabase } from '../lib/supabase';

export async function safeFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('არაავტორიზებული მოთხოვნა — სესია ვერ მოიძებნა');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || json.message || `სერვერის შეცდომა (${res.status})`);
  }

  return json as T;
}
