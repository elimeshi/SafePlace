import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilterSettings, Viewer } from "@safeplace/visibility-policy";

/**
 * Build the Viewer context that @safeplace/visibility-policy needs, from the
 * currently authenticated Supabase user. Call this once per
 * request/screen-load and pass the resulting Viewer down — don't reconstruct
 * it ad hoc in multiple places, and don't let individual screens read raw
 * profile rows to make their own visibility decisions.
 *
 * Under RLS every read here resolves the caller's OWN rows (profile, settings,
 * memberships, follow edges) — the same rows the DB policies consult — so the
 * app-side Viewer and the DB enforcement stay in agreement by construction.
 */
export async function buildViewerContext(
  supabase: SupabaseClient,
  userId: string
): Promise<Viewer> {
  const [
    { data: profile, error: profileError },
    { data: settings, error: settingsError },
    groupMemberships,
    familySpaceMemberships,
    following,
    blockedUsers,
    mutedUsers,
    suppressedSuggestions,
  ] = await Promise.all([
    supabase.from("profiles").select("gender").eq("id", userId).single(),
    supabase
      .from("filter_settings")
      .select(
        "hide_content_with_women, hide_women_accounts, filter_applies_to_avatars, show_suggested_posts, gender_separation_in_messages, gender_separation_in_search"
      )
      .eq("user_id", userId)
      .single(),
    fetchIdSet(supabase, "group_members", "group_id", userId),
    fetchIdSet(supabase, "family_space_members", "space_id", userId),
    fetchIdSet(supabase, "follows", "followed_id", userId, "follower_id"),
    // Own edges only (RLS): blocks AGAINST the viewer are unknowable here, so
    // the database stays the authority for those.
    fetchIdSet(supabase, "blocks", "blocked_id", userId, "blocker_id"),
    fetchIdSet(supabase, "user_mutes", "muted_id", userId, "muter_id"),
    fetchIdSet(supabase, "suggestion_feedback", "target_user_id", userId, "viewer_id"),
  ]);

  if (profileError || !profile) {
    throw new Error(
      `buildViewerContext: could not load profile for user ${userId}: ${profileError?.message ?? "not found"}`
    );
  }
  if (settingsError || !settings) {
    throw new Error(
      `buildViewerContext: could not load filter_settings for user ${userId}: ${settingsError?.message ?? "not found"}`
    );
  }

  return {
    userId,
    gender: (profile as { gender: Viewer["gender"] }).gender,
    filterSettings: mapFilterSettings(settings as FilterSettingsRow),
    groupMemberships,
    familySpaceMemberships,
    following,
    blockedUsers,
    mutedUsers,
    suppressedSuggestions,
  };
}

interface FilterSettingsRow {
  hide_content_with_women: boolean;
  hide_women_accounts: boolean;
  filter_applies_to_avatars: boolean;
  show_suggested_posts: boolean;
  gender_separation_in_messages: boolean;
  gender_separation_in_search: boolean;
}

/** Map the snake_case DB row to the camelCase FilterSettings the policy uses. */
export function mapFilterSettings(row: FilterSettingsRow): FilterSettings {
  return {
    hideContentWithWomen: row.hide_content_with_women,
    // Minimal derived value; Task 12 replaces it with the real per-group columns.
    contentLevels: { sex: row.hide_content_with_women ? 0 : 1, violence: 0, religion: 0, addictions: 0 },
    hideWomenAccounts: row.hide_women_accounts,
    filterAppliesToAvatars: row.filter_applies_to_avatars,
    showSuggestedPosts: row.show_suggested_posts,
    genderSeparationInMessages: row.gender_separation_in_messages,
    genderSeparationInSearch: row.gender_separation_in_search,
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

  const rows = (data ?? []) as unknown as Array<Record<string, string>>;
  const ids = rows
    .map((row) => row[selectColumn])
    .filter((id): id is string => typeof id === "string");
  return new Set(ids);
}
