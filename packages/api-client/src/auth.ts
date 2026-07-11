import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gender } from "@safeplace/visibility-policy";

export interface SignUpParams {
  email: string;
  password: string;
  /** Declared at signup — drives the gender-conditioned filter DEFAULTS. */
  gender: Gender;
  displayName: string;
}

/**
 * Sign up, declaring a gender. The gender + display name ride in the auth user
 * metadata (raw_user_meta_data); the DB's handle_new_user trigger reads them to
 * create the profile and seed gender-conditioned filter DEFAULTS (invariant #3
 * — defaults, not rules; every seeded flag stays user-editable afterwards).
 *
 * The client never writes the profile/filter_settings rows directly — the
 * trigger is the single source of the signup defaults, so app and DB can't
 * disagree on them.
 */
export function signUpWithGender(supabase: SupabaseClient, params: SignUpParams) {
  if (params.gender !== "male" && params.gender !== "female") {
    throw new Error(`signUpWithGender: invalid gender ${String(params.gender)}`);
  }
  return supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { gender: params.gender, display_name: params.displayName },
    },
  });
}

export function signIn(supabase: SupabaseClient, email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}

/** The authenticated user's id, or null if signed out. */
export async function getSessionUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
