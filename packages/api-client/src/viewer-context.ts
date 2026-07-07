import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "@safeplace/visibility-policy";

/**
 * Build the Viewer context that @safeplace/visibility-policy needs, from
 * the currently authenticated Supabase user. Call this once per
 * request/screen-load and pass the resulting Viewer down — don't
 * reconstruct it ad hoc in multiple places, and don't let individual
 * screens read raw profile rows to make their own visibility decisions.
 *
 * NOTE: this is a skeleton. It assumes a `profiles` table (1:1 with
 * auth.users) and `group_members` / `family_space_members` / `follows`
 * tables per docs/architecture/data-model.md. Fill in the actual table/
 * column names as the Supabase schema is created — this function is the
 * single place that mapping should live.
 */
export async function buildViewerContext(
  supabase: SupabaseClient,
  userId: string
): Promise<Viewer> {
  const [{ data: profile, error: profileError }, groupMemberships, familySpaceMemberships, following] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("gender, filter_settings")
        .eq("id", userId)
        .single(),
      fetchIdSet(supabase, "group_members", "group_id", userId),
      fetchIdSet(supabase, "family_space_members", "space_id", userId),
      fetchIdSet(supabase, "follows", "followed_id", userId, "follower_id"),
    ]);

  if (profileError || !profile) {
    throw new Error(
      `buildViewerContext: could not load profile for user ${userId}: ${profileError?.message ?? "not found"}`
    );
  }

  return {
    userId,
    gender: profile.gender,
    filterSettings: profile.filter_settings,
    groupMemberships,
    familySpaceMemberships,
    following,
  };
}

async function fetchIdSet(
  supabase: SupabaseClient,
  table: string,
  selectColumn: string,
  userId: string,
  userColumn = "user_id"
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(table)
    .select(selectColumn)
    .eq(userColumn, userId);

  if (error) {
    throw new Error(`fetchIdSet(${table}): ${error.message}`);
  }

  return new Set((data ?? []).map((row: Record<string, string>) => row[selectColumn]));
}
