import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAudienceSetValid,
  type ContentExposure,
  type Gender,
} from "@safeplace/visibility-policy";
import { LEVEL_COLUMNS, levelsFromRow, type LevelColumns } from "./media";
import { exposureToAudienceRows, type AttachedMedia } from "./posts";
import { resolveUploaderMediaViews, type UploaderMediaView } from "./moderation";
import type { MediaClassification } from "@safeplace/visibility-policy";

/**
 * Compose = classify while composing (plan §2): attaching media creates an
 * author-only DRAFT and inserts the media row, so the pipeline runs while the
 * user types. Publish never waits for it. Every media row goes in as
 * 'unclassified' (invariant #1/#8): the client never sets a classification.
 *
 * Flow: createDraft -> setAudiences -> attachMedia -> pollUploaderMedia
 *       -> publishDraft  (removeMedia / appealClassification / deleteDraft as needed)
 */

export type DraftSource =
  | { kind: "profile" }
  | { kind: "group"; groupId: string }
  | { kind: "family_space"; spaceId: string };

export interface CreateDraftParams {
  authorId: string;
  text?: string;
  locationTag?: string | null;
  /** Entry point; a group / Family Space locks the audience to it (02 §4.3). */
  source?: DraftSource;
  /** Share-to-group: the original being quoted. */
  quotedPostId?: string | null;
}

export async function createDraft(
  supabase: SupabaseClient,
  params: CreateDraftParams
): Promise<{ postId: string }> {
  const source = params.source ?? { kind: "profile" };
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: params.authorId,
      text: params.text ?? "",
      location_tag: params.locationTag ?? null,
      status: "draft",
      source_kind: source.kind,
      source_group_id: source.kind === "group" ? source.groupId : null,
      source_space_id: source.kind === "family_space" ? source.spaceId : null,
      quoted_post_id: params.quotedPostId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createDraft: ${error?.message ?? "insert returned no row"}`);
  return { postId: (data as { id: string }).id };
}

/** Replace a draft's audiences (the picker is multi-select). Validated client-side, enforced by the DB. */
export async function setAudiences(
  supabase: SupabaseClient,
  postId: string,
  exposure: ContentExposure
): Promise<void> {
  if (!isAudienceSetValid(exposure)) throw new Error("setAudiences: invalid audience combination");
  const { error: delError } = await supabase.from("post_audiences").delete().eq("post_id", postId);
  if (delError) throw new Error(`setAudiences: ${delError.message}`);
  const { error } = await supabase.from("post_audiences").insert(exposureToAudienceRows(postId, exposure));
  if (error) throw new Error(`setAudiences: ${error.message}`);
}

/** Update the draft's text / location as the user types. */
export async function updateDraft(
  supabase: SupabaseClient,
  postId: string,
  patch: { text?: string; locationTag?: string | null }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.text !== undefined) row.text = patch.text;
  if (patch.locationTag !== undefined) row.location_tag = patch.locationTag;
  const { error } = await supabase.from("posts").update(row).eq("id", postId);
  if (error) throw new Error(`updateDraft: ${error.message}`);
}

/** Insert media rows (unclassified) on the draft; the insert trigger enqueues classification. */
export async function attachMedia(
  supabase: SupabaseClient,
  params: { postId: string; uploaderId: string; media: AttachedMedia[] }
): Promise<{ mediaIds: string[] }> {
  const { data, error } = await supabase
    .from("media_items")
    .insert(
      params.media.map((m) => ({
        post_id: params.postId,
        uploader_id: params.uploaderId,
        storage_path: m.storagePath,
        content_type: m.contentType,
      }))
    )
    .select("id");
  if (error) throw new Error(`attachMedia: ${error.message}`);
  return { mediaIds: ((data ?? []) as Array<{ id: string }>).map((r) => r.id) };
}

export interface UploaderMediaPoll {
  views: UploaderMediaView[];
  /** True once no item is still 'unclassified' (poll again until then). */
  settled: boolean;
}

/** How the author's own attached media currently stands, presented through visibility-policy. */
export async function pollUploaderMedia(
  supabase: SupabaseClient,
  postId: string,
  uploaderGender: Gender
): Promise<UploaderMediaPoll> {
  const { data, error } = await supabase
    .from("media_items_visible")
    .select(`id, classification, ${LEVEL_COLUMNS}`)
    .eq("post_id", postId);
  if (error) throw new Error(`pollUploaderMedia: ${error.message}`);
  const rows = (data ?? []) as Array<{ id: string; classification: MediaClassification } & LevelColumns>;
  return {
    views: resolveUploaderMediaViews(rows.map((r) => ({ id: r.id, classification: r.classification, levels: levelsFromRow(r) })), uploaderGender),
    settled: rows.every((r) => r.classification !== "unclassified"),
  };
}

/**
 * Publish a draft. Never waits on classification. The database validates the
 * audience set, membership, source consistency and quote permission here.
 */
export async function publishDraft(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase.from("posts").update({ status: "published" }).eq("id", postId);
  if (error) throw new Error(`publishDraft: ${error.message}`);
}

/** Remove one of your own media items (the notice's "Remove media"). */
export async function removeMedia(supabase: SupabaseClient, mediaId: string): Promise<void> {
  const { error } = await supabase.from("media_items").delete().eq("id", mediaId);
  if (error) throw new Error(`removeMedia: ${error.message}`);
}

/** Discard a draft (own, still a draft); cascades to its audiences and media rows. */
export async function deleteDraft(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("status", "draft");
  if (error) throw new Error(`deleteDraft: ${error.message}`);
}

/**
 * Share a post to a group as a quote post, via the same draft -> publish flow.
 * No media is copied; the viewer's filter still applies to the original. The
 * database refuses a share the policy forbids (can_share_internally); on any
 * failure the draft is discarded.
 */
export async function shareToGroup(
  supabase: SupabaseClient,
  params: { authorId: string; quotedPostId: string; groupId: string; text?: string }
): Promise<{ postId: string }> {
  const { postId } = await createDraft(supabase, {
    authorId: params.authorId,
    text: params.text,
    source: { kind: "group", groupId: params.groupId },
    quotedPostId: params.quotedPostId,
  });
  try {
    await setAudiences(supabase, postId, [{ kind: "group", groupId: params.groupId }]);
    await publishDraft(supabase, postId);
  } catch (e) {
    await deleteDraft(supabase, postId).catch(() => undefined);
    throw e;
  }
  return { postId };
}
