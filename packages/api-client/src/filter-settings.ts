import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilterSettings } from "@safeplace/visibility-policy";
import { mapFilterSettings } from "./viewer-context";

const COLUMNS =
  "max_sex_level, max_violence_level, max_religion_level, max_addictions_level, hide_women_accounts, filter_applies_to_avatars, show_suggested_posts, gender_separation_in_messages, gender_separation_in_search";

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
    // 0 hides every depiction of a woman; 1 = modest women visible. Raising to 2
    // is an explicit settings choice, never the result of this toggle.
    .update({ max_sex_level: contentFilterEnabled ? 0 : 1 })
    .eq("user_id", userId);
  if (error) {
    throw new Error(`setContentFilterEnabled: ${error.message}`);
  }
}

/** Snake-case DB column names for the boolean keys. contentLevels expands into four columns; hideContentWithWomen is derived (generated column), so it has none. */
const COLUMN_OF: Record<Exclude<keyof FilterSettings, "contentLevels" | "hideContentWithWomen">, string> = {
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
  patch: Partial<Omit<FilterSettings, "hideContentWithWomen">>
): Promise<void> {
  const dbPatch: Record<string, boolean | number> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === "contentLevels") {
      const lv = value as FilterSettings["contentLevels"];
      Object.assign(dbPatch, {
        max_sex_level: lv.sex,
        max_violence_level: lv.violence,
        max_religion_level: lv.religion,
        max_addictions_level: lv.addictions,
      });
      continue;
    }
    dbPatch[COLUMN_OF[key as keyof typeof COLUMN_OF]] = value as boolean;
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
