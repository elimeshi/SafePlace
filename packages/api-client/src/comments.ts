import type { SupabaseClient } from "@supabase/supabase-js";
import { toMediaView, type MediaRow, type MediaView } from "./feed";
import type { AttachedMedia } from "./posts";

/**
 * Two-level comments (03 §3.1). Blocked and muted authors are dropped by RLS
 * (visibility.comment_visible), never by the client. Counts come from
 * comment_stats: a number, never a list of likers.
 */

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  /** Whom a level-2 reply answers (derived by the database, never the client). */
  replyToUserId: string | null;
  text: string;
  createdAt: string;
  editedAt: string | null;
  likeCount: number;
  viewerLiked: boolean;
  media: MediaView[];
}

export interface CommentThread {
  comment: Comment;
  /** All replies of this comment, oldest first. */
  replies: Comment[];
}

export interface CommentCursor {
  createdAt: string;
  id: string;
}

export interface CommentPage {
  threads: CommentThread[];
  nextCursor: CommentCursor | null;
}

export const COMMENTS_PAGE_SIZE = 20;

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  reply_to_user_id: string | null;
  text: string;
  created_at: string;
  edited_at: string | null;
}

const COMMENT_COLUMNS =
  "id, post_id, author_id, parent_comment_id, reply_to_user_id, text, created_at, edited_at";

/** Top-level comments (20 per page, keyset), each with ALL its replies. */
export async function fetchComments(
  supabase: SupabaseClient,
  postId: string,
  options: { cursor?: CommentCursor | null; limit?: number } = {}
): Promise<CommentPage> {
  const limit = options.limit ?? COMMENTS_PAGE_SIZE;
  let q = supabase
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq("post_id", postId)
    .is("parent_comment_id", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (options.cursor) {
    const { createdAt, id } = options.cursor;
    q = q.or(`created_at.gt.${createdAt},and(created_at.eq.${createdAt},id.gt.${id})`);
  }
  const { data: tops, error } = await q;
  if (error) throw new Error(`fetchComments: ${error.message}`);
  const topRows = (tops ?? []) as CommentRow[];

  let replyRows: CommentRow[] = [];
  if (topRows.length > 0) {
    const { data, error: replyError } = await supabase
      .from("comments")
      .select(COMMENT_COLUMNS)
      .in("parent_comment_id", topRows.map((r) => r.id))
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (replyError) throw new Error(`fetchComments replies: ${replyError.message}`);
    replyRows = (data ?? []) as CommentRow[];
  }

  const all = [...topRows, ...replyRows];
  const ids = all.map((r) => r.id);
  const [stats, media] = await Promise.all([fetchCommentStats(supabase, ids), fetchCommentMedia(supabase, ids)]);

  const build = (r: CommentRow): Comment => ({
    id: r.id,
    postId: r.post_id,
    authorId: r.author_id,
    parentCommentId: r.parent_comment_id,
    replyToUserId: r.reply_to_user_id,
    text: r.text,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    likeCount: stats.get(r.id)?.likeCount ?? 0,
    viewerLiked: stats.get(r.id)?.viewerLiked ?? false,
    media: media.get(r.id) ?? [],
  });

  const threads = topRows.map<CommentThread>((r) => ({
    comment: build(r),
    replies: replyRows.filter((x) => x.parent_comment_id === r.id).map(build),
  }));
  const last = topRows[topRows.length - 1];
  return {
    threads,
    nextCursor: last && topRows.length >= limit ? { createdAt: last.created_at, id: last.id } : null,
  };
}

export async function fetchCommentStats(
  supabase: SupabaseClient,
  commentIds: string[]
): Promise<Map<string, { likeCount: number; viewerLiked: boolean }>> {
  const out = new Map<string, { likeCount: number; viewerLiked: boolean }>();
  if (commentIds.length === 0) return out;
  const { data, error } = await supabase.rpc("comment_stats", { p_comment_ids: commentIds });
  if (error) throw new Error(`fetchCommentStats: ${error.message}`);
  for (const r of (data ?? []) as Array<{ comment_id: string; like_count: number; viewer_liked: boolean }>) {
    out.set(r.comment_id, { likeCount: r.like_count, viewerLiked: r.viewer_liked });
  }
  return out;
}

/** Comment media always via media_items_visible: a filtered viewer never gets a path. */
async function fetchCommentMedia(
  supabase: SupabaseClient,
  commentIds: string[]
): Promise<Map<string, MediaView[]>> {
  const out = new Map<string, MediaView[]>();
  if (commentIds.length === 0) return out;
  const { data, error } = await supabase
    .from("media_items_visible")
    .select("id, comment_id, classification, storage_path, is_filtered, is_redacted")
    .in("comment_id", commentIds);
  if (error) throw new Error(`fetchComments media: ${error.message}`);
  for (const r of (data ?? []) as Array<MediaRow & { comment_id: string }>) {
    const list = out.get(r.comment_id) ?? [];
    list.push(toMediaView(r));
    out.set(r.comment_id, list);
  }
  return out;
}

export interface AddCommentParams {
  authorId: string;
  postId: string;
  text: string;
  /** Reply target. Replying to a reply is fine: the database re-parents it. */
  parentCommentId?: string | null;
  /** Already uploaded (uploadMedia); inserted 'unclassified', so the pipeline classifies it. */
  media?: AttachedMedia[];
}

/** Add a comment or reply. Returns the new id and the ids of its media rows. */
export async function addComment(
  supabase: SupabaseClient,
  params: AddCommentParams
): Promise<{ commentId: string; mediaIds: string[] }> {
  if (!params.text.trim() && !(params.media && params.media.length > 0)) {
    throw new Error("addComment: a comment needs text or media");
  }
  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_id: params.authorId,
      post_id: params.postId,
      parent_comment_id: params.parentCommentId ?? null,
      text: params.text,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`addComment: ${error?.message ?? "insert returned no row"}`);
  const commentId = (data as { id: string }).id;

  let mediaIds: string[] = [];
  if (params.media && params.media.length > 0) {
    const { data: rows, error: mediaError } = await supabase
      .from("media_items")
      .insert(
        params.media.map((m) => ({
          comment_id: commentId,
          uploader_id: params.authorId,
          storage_path: m.storagePath,
          content_type: m.contentType,
        }))
      )
      .select("id");
    if (mediaError) throw new Error(`addComment: media insert failed: ${mediaError.message}`);
    mediaIds = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id);
  }
  return { commentId, mediaIds };
}

/** A reply is a comment with a parent; a thin alias that keeps call sites explicit. */
export const addReply = (
  supabase: SupabaseClient,
  params: AddCommentParams & { parentCommentId: string }
) => addComment(supabase, params);
