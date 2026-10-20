import type { SupabaseClient } from "@supabase/supabase-js";
import { canCopyExternalLink, type Viewer } from "@safeplace/visibility-policy";
import { postContextOf, type PostItem } from "./feed";

/**
 * Explicit signals only (plan §2): like, save, mute, suggestion feedback.
 * Every row is private to its owner (RLS); nothing here reads a list back.
 */

const UNIQUE_VIOLATION = "23505";

async function add(
  supabase: SupabaseClient,
  fn: string,
  table: string,
  row: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from(table).insert(row);
  // Idempotent: tapping twice (or a retry) is not an error.
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(`${fn}: ${error.message}`);
}

async function remove(
  supabase: SupabaseClient,
  fn: string,
  table: string,
  match: Record<string, string>
): Promise<void> {
  let q = supabase.from(table).delete();
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error) throw new Error(`${fn}: ${error.message}`);
}

export const likePost = (s: SupabaseClient, userId: string, postId: string) =>
  add(s, "likePost", "post_likes", { post_id: postId, user_id: userId });
export const unlikePost = (s: SupabaseClient, userId: string, postId: string) =>
  remove(s, "unlikePost", "post_likes", { post_id: postId, user_id: userId });

export const likeComment = (s: SupabaseClient, userId: string, commentId: string) =>
  add(s, "likeComment", "comment_likes", { comment_id: commentId, user_id: userId });
export const unlikeComment = (s: SupabaseClient, userId: string, commentId: string) =>
  remove(s, "unlikeComment", "comment_likes", { comment_id: commentId, user_id: userId });

export const savePost = (s: SupabaseClient, userId: string, postId: string) =>
  add(s, "savePost", "post_saves", { post_id: postId, user_id: userId });
export const unsavePost = (s: SupabaseClient, userId: string, postId: string) =>
  remove(s, "unsavePost", "post_saves", { post_id: postId, user_id: userId });

/** Silent, and not a block: hides their posts from your feed and their comments from you. */
export const muteUser = (s: SupabaseClient, muterId: string, mutedId: string) =>
  add(s, "muteUser", "user_mutes", { muter_id: muterId, muted_id: mutedId });
export const unmuteUser = (s: SupabaseClient, muterId: string, mutedId: string) =>
  remove(s, "unmuteUser", "user_mutes", { muter_id: muterId, muted_id: mutedId });

export type SuggestionFeedbackKind = "less_like_this" | "dont_suggest";

export const sendSuggestionFeedback = (
  s: SupabaseClient,
  viewerId: string,
  targetUserId: string,
  kind: SuggestionFeedbackKind
) =>
  add(s, "sendSuggestionFeedback", "suggestion_feedback", {
    viewer_id: viewerId,
    target_user_id: targetUserId,
    kind,
  });

/** Dismiss a follow suggestion: same stored signal as "don't suggest". */
export const dismissFollowSuggestion = (s: SupabaseClient, viewerId: string, targetUserId: string) =>
  sendSuggestionFeedback(s, viewerId, targetUserId, "dont_suggest");

/** The public URL for a post. Opening it requires sign-in (legal #13). Pure. */
export function buildPostLink(baseUrl: string, postId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/post/${encodeURIComponent(postId)}`;
}

/**
 * The link to put on the clipboard, or null when the policy forbids it (only a
 * public, visible, published post may have an external link). The UI hides the
 * row on null; the clipboard call itself (expo-clipboard) stays in the app.
 */
export function getCopyLink(viewer: Viewer, post: PostItem, baseUrl: string): string | null {
  const ctx = postContextOf(post);
  return ctx && canCopyExternalLink(viewer, ctx) ? buildPostLink(baseUrl, post.id) : null;
}
