import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilterSettings } from "@safeplace/visibility-policy";
import { mapFilterSettings } from "./viewer-context";

const COLUMNS =
  "hide_content_with_women, hide_women_accounts, filter_applies_to_avatars, show_suggested_posts, gender_separation_in_messages, gender_separation_in_search";

/** Read the signed-in user's own filter settings (RLS: owner-only). */
export async function getFilterSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<FilterSettings> {
  const { data, error } = await supabase
    .from("filter_settings")
    .select(COLUMNS)
    .eq("user_id", userId)
    .single();
  if (error || !data) {
    throw new Error(
      `getFilterSettings: ${error?.message ?? "no settings row"} for ${userId}`
    );
  }
  return mapFilterSettings(data as Parameters<typeof mapFilterSettings>[0]);
}

/**
 * Toggle the content filter for the signed-in user (invariant #3: this is the
 * one boolean, frictionlessly changeable). The name uses `contentFilterEnabled`
 * framing per visibility-model §5 — never "restricted user".
 *
 * The dangerous-action double-confirm this setting requires (settings-spec §4)
 * is a UI concern (Phase 6); this helper is the underlying mutation only.
 */
export async function setContentFilterEnabled(
  supabase: SupabaseClient,
  userId: string,
  contentFilterEnabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("filter_settings")
    .update({ hide_content_with_women: contentFilterEnabled })
    .eq("user_id", userId);
  if (error) {
    throw new Error(`setContentFilterEnabled: ${error.message}`);
  }
}

/** Snake-case DB column names for a FilterSettings key. contentLevels has no column yet (Task 12), so it is not patchable. */
const COLUMN_OF: Record<Exclude<keyof FilterSettings, "contentLevels">, string> = {
  hideContentWithWomen: "hide_content_with_women",
  hideWomenAccounts: "hide_women_accounts",
  filterAppliesToAvatars: "filter_applies_to_avatars",
  showSuggestedPosts: "show_suggested_posts",
  genderSeparationInMessages: "gender_separation_in_messages",
  genderSeparationInSearch: "gender_separation_in_search",
};

/** Update any subset of the user's own filter settings. */
export async function updateFilterSettings(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Omit<FilterSettings, "contentLevels">>
): Promise<void> {
  const dbPatch: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    dbPatch[COLUMN_OF[key as keyof typeof COLUMN_OF]] = value;
  }
  if (Object.keys(dbPatch).length === 0) return;

  const { error } = await supabase
    .from("filter_settings")
    .update(dbPatch)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`updateFilterSettings: ${error.message}`);
  }
}
