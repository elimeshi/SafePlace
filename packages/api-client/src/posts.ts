import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentExposure, MediaClassification } from "@safeplace/visibility-policy";

interface AudienceRow {
  post_id: string;
  kind: ContentExposure[number]["kind"];
  group_id: string | null;
  space_id: string | null;
  position: number;
}

/** One post_audiences row per audience, in pick order. */
export function exposureToAudienceRows(postId: string, exposure: ContentExposure): AudienceRow[] {
  return exposure.map((a, position) => ({
    post_id: postId,
    kind: a.kind,
    group_id: a.kind === "group" ? a.groupId : null,
    space_id: a.kind === "family_space" ? a.spaceId : null,
    position,
  }));
}

/**
 * A media object already uploaded to the private bucket (see uploadMedia),
 * ready to be attached to content. The content type travels with it because
 * the classification pipeline needs to know what it is looking at before it
 * looks — an image classifier must not be handed a video, and a type it
 * cannot read is routed to a human rather than guessed at.
 */
export interface AttachedMedia {
  storagePath: string;
  contentType: string;
}

export interface CreatePostParams {
  authorId: string;
  exposure: ContentExposure;
  text?: string;
  /** Already-uploaded media to attach (see uploadMedia). */
  media?: AttachedMedia[];
  locationTag?: string | null;
}

/**
 * Create a post plus any media rows. Media is inserted as 'unclassified' — the
 * client never sets a classification (invariant #1); the pipeline (Phase 3)
 * transitions it. RLS enforces both: a client may only author its own post and
 * attach its own unclassified media to it.
 */
export async function createPost(
  supabase: SupabaseClient,
  params: CreatePostParams
): Promise<{ postId: string }> {
  // A post is born a draft, gets its audience rows, then is published; the
  // database validates the combination and membership at that last step.
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: params.authorId,
      text: params.text ?? "",
      location_tag: params.locationTag ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !post) {
    throw new Error(`createPost: ${error?.message ?? "insert returned no row"}`);
  }
  const postId = (post as { id: string }).id;

  const { error: audienceError } = await supabase
    .from("post_audiences")
    .insert(exposureToAudienceRows(postId, params.exposure));
  if (audienceError) {
    throw new Error(`createPost: audience insert failed: ${audienceError.message}`);
  }

  if (params.media && params.media.length > 0) {
    const rows = params.media.map((item) => ({
      post_id: postId,
      uploader_id: params.authorId,
      storage_path: item.storagePath,
      content_type: item.contentType,
      // classification omitted → DB default 'unclassified'. The insert also
      // enqueues a classification job via trigger (migration 0008), so there
      // is no separate "remember to call the pipeline" step here.
    }));
    const { error: mediaError } = await supabase.from("media_items").insert(rows);
    if (mediaError) {
      throw new Error(`createPost: media insert failed: ${mediaError.message}`);
    }
  }

  const { error: publishError } = await supabase
    .from("posts")
    .update({ status: "published" })
    .eq("id", postId);
  if (publishError) {
    throw new Error(`createPost: publish failed: ${publishError.message}`);
  }

  return { postId };
}

export interface PostMediaView {
  id: string;
  classification: MediaClassification;
  storage_path: string | null;
  is_filtered: boolean;
}

/**
 * Fetch a post (RLS-gated by exposure + blocks) together with its media as seen
 * through media_items_visible (classification-gated URLs). Returns null if the
 * post isn't visible to the caller. Media entries carry is_filtered so the UI
 * can render placeholders without ever receiving a withheld path.
 */
export async function fetchPostWithMedia(
  supabase: SupabaseClient,
  postId: string
): Promise<{ post: Record<string, unknown>; media: PostMediaView[] } | null> {
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(`fetchPostWithMedia: ${error.message}`);
  if (!post) return null;

  const { data: media, error: mediaError } = await supabase
    .from("media_items_visible")
    .select("id, classification, storage_path, is_filtered")
    .eq("post_id", postId);
  if (mediaError) throw new Error(`fetchPostWithMedia media: ${mediaError.message}`);

  return {
    post: post as Record<string, unknown>,
    media: (media ?? []) as PostMediaView[],
  };
}
