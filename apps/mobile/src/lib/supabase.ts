// Must run before the Supabase client is constructed: supabase-js relies on a
// spec-complete URL implementation, and Hermes' built-in one is partial.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient } from "@safeplace/api-client";
import { env } from "./env";

/**
 * The app's single Supabase client. Constructed once here and imported by the
 * session provider and query helpers — never call createSupabaseClient() (or
 * createClient()) anywhere else. AsyncStorage persists the auth session across
 * app launches (autoRefresh + persist are on by default in the factory). See
 * ADR 0008.
 */
export const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
  authStorage: AsyncStorage,
});
