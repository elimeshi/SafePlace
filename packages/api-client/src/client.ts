import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * A minimal key/value store compatible with Supabase Auth's session storage.
 * React Native has no `localStorage`, so the mobile app passes an adapter
 * (e.g. `@react-native-async-storage/async-storage`) to persist the session
 * across app launches. Kept structural (not a hard dep on any RN package) so
 * this package stays platform-agnostic.
 */
export interface AuthSessionStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface CreateSupabaseClientOptions {
  /**
   * Where to persist the auth session. On React Native pass an AsyncStorage
   * instance; omit on server/Node (Supabase falls back to in-memory).
   */
  authStorage?: AuthSessionStorage;
  /** Keep the session between launches. Defaults to true. */
  persistSession?: boolean;
  /** Refresh the access token in the background. Defaults to true. */
  autoRefreshToken?: boolean;
  /**
   * Parse the session out of a redirect URL. Web-OAuth only; must be false on
   * React Native (there is no URL bar). Defaults to false — this is an
   * RN-first product.
   */
  detectSessionInUrl?: boolean;
}

/**
 * Thin factory around the Supabase client. Apps construct this once at
 * startup with their env-specific URL/key and pass it into the query
 * helpers in this package — don't call createClient() ad hoc elsewhere.
 *
 * Pass `authStorage` on React Native so the session survives app restarts
 * (see apps/mobile/src/lib/supabase.ts and ADR 0008). With no options the
 * defaults are RN-safe (persist + auto-refresh on, no URL detection).
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options: CreateSupabaseClientOptions = {}
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "createSupabaseClient: missing url or anonKey. Check EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example)."
    );
  }
  const {
    authStorage,
    persistSession = true,
    autoRefreshToken = true,
    detectSessionInUrl = false,
  } = options;

  return createClient(url, anonKey, {
    auth: {
      ...(authStorage ? { storage: authStorage } : {}),
      persistSession,
      autoRefreshToken,
      detectSessionInUrl,
    },
  });
}

export type { SupabaseClient, Session, User, AuthChangeEvent } from "@supabase/supabase-js";
