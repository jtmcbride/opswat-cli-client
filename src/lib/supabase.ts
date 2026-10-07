import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Remote, Row } from './sync';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Null when this build has no Supabase project configured (sync is then hidden). */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      })
    : null;

const TABLE = 'sync_items';

export function supabaseRemote(client: SupabaseClient, userId: string): Remote {
  return {
    async pull(afterSeq, limit) {
      const { data, error } = await client
        .from(TABLE)
        .select('key,data,deleted,updated_at,seq')
        .gt('seq', afterSeq)
        .order('seq')
        .limit(limit);
      if (error) throw new Error(error.message);
      return data as Row[];
    },
    async push(rows) {
      const { error } = await client.from(TABLE).upsert(
        rows.map((r) => ({ ...r, user_id: userId })),
        { onConflict: 'user_id,key' },
      );
      if (error) throw new Error(error.message);
    },
  };
}

/** Deletes everything this account has synced. */
export async function deleteRemoteData(client: SupabaseClient, userId: string) {
  const { error } = await client.from(TABLE).delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}
