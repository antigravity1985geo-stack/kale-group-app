import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Event = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export function useRealtime<T = any>(
  table: string,
  event: Event,
  callback: (payload: { new: T; old: T }) => void,
  filter?: string
) {
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`realtime:${table}:${event}`)
        .on('postgres_changes' as any, { event, schema: 'public', table, filter: filter || undefined }, callback as any)
        .subscribe();
    } catch (e) {
      // In case Realtime is disabled
      console.warn('[Realtime] subscribe failed', e);
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [table, event, filter]);
}
