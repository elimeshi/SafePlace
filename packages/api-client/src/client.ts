import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Thin factory around the Supabase client. Apps construct this once at
 * startup with their env-specific URL/key and pass it into the query
 * helpers in this package — don't call createClient() ad hoc elsewhere.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "createSupabaseClient: missing url or anonKey. Check EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example)."
    );
  }
  return createClient(url, anonKey);
}

export type { SupabaseClient };
