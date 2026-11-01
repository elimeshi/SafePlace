import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gender, MediaClassification } from "@safeplace/visibility-policy";
import { resolveUploaderMediaState } from "@safeplace/visibility-policy";
import type { UploaderMediaState } from "@safeplace/visibility-policy";

/**
 * The client's two moderation entry points: disputing a classification of your
 * own media (07-moderation-spec.md §2.3) and reporting someone else's content
 * (§3). Both end up in the same moderator queue, and neither gives the caller
 * any view of it — a client has no rights in the moderation schema, and these
 * helpers do not create an exception to that.
 */

export type ReportTargetType = "post" | "comment" | "message" | "user";

/** The categories offered in the report form (§3.3). */
export type ReportCategory =
  | "contains_women"
  | "harassment"
  | "dangerous_content"
  | "spam"
  | "misinformation"
  | "other";

export interface ReportParams {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  /** The reporter's own words — optional (§3.2). */
  explanation?: string | null;
}

/**
 * File a report. It always creates human review and never removes anything by
 * itself (§3.1): there is deliberately no report count at which content is
 * taken down, which is what protects a user from a coordinated reporting
 * campaign.
 *
 * The caller gets back nothing but success. Per §3.4 the reporter sees a
 * confirmation and no further updates on handling.
 */
export async function reportContent(
  supabase: SupabaseClient,
  params: ReportParams
): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: params.reporterId,
    target_type: params.targetType,
    target_id: params.targetId,
    category: params.category,
    free_text_explanation: params.explanation ?? null,
  });
  if (error) {
    throw new Error(`reportContent: ${error.message}`);
  }
}

/**
 * Dispute the AI's classification of your own media. Idempotent — tapping
 * "appeal" twice must not put two copies in front of two moderators — and
 * refused for anyone but the uploader, by the function itself rather than by
 * this helper.
 */
export async function appealClassification(
  supabase: SupabaseClient,
  mediaItemId: string,
  note?: string | null
): Promise<{ appealId: string }> {
  const { data, error } = await supabase.rpc("appeal_classification", {
    p_media_item_id: mediaItemId,
    p_note: note ?? null,
  });
  if (error) {
    throw new Error(`appealClassification: ${error.message}`);
  }
  return { appealId: data as string };
}

export interface UploaderMediaView {
  id: string;
  classification: MediaClassification;
  state: UploaderMediaState;
}

/**
 * How an uploader's own media should be presented back to them — "processing",
 * "under review", or the neutral notice — derived through visibility-policy
 * rather than by reading the classification in a screen.
 *
 * The uploader always sees their own media itself (canViewMedia's uploader
 * short-circuit); this is only about what they are told alongside it.
 */
export function resolveUploaderMediaViews(
  media: Array<{ id: string; classification: MediaClassification }>,
  uploaderGender: Gender
): UploaderMediaView[] {
  return media.map((item) => ({
    id: item.id,
    classification: item.classification,
    // shortcut: derived from lifecycle until Task 12 reads the level columns
    state: resolveUploaderMediaState(
      item.classification,
      item.classification === "general" || item.classification === "contains_women"
        ? { sex: item.classification === "contains_women" ? 1 : 0, violence: 0, religion: 0, addictions: 0 }
        : null,
      uploaderGender
    ),
  }));
}
