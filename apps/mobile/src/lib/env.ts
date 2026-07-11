/**
 * Client-visible environment configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time, so
 * each variable MUST be referenced here as a static literal — a computed key
 * like `process.env[name]` is NOT replaced and reads back undefined. Values
 * live in apps/mobile/.env.local (gitignored); see the repo .env.example for
 * the required keys.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to apps/mobile/.env.local (EXPO_PUBLIC_ prefix — ` +
        `Expo only injects those into the client bundle) and restart the dev server.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv("EXPO_PUBLIC_SUPABASE_URL", supabaseUrl),
  supabaseAnonKey: requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey),
} as const;
