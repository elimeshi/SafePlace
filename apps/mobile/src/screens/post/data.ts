import type { SupabaseClient } from "@safeplace/api-client";
import {
  addComment,
  appealClassification,
  buildViewerContext,
  fetchComments,
  fetchPost,
  fetchQuotedPost,
  getCopyLink,
  LEVEL_COLUMNS,
  likeComment,
  likePost,
  muteUser,
  postContextOf,
  removeMedia,
  reportContent,
  resolveMediaUrls,
  resolveSourceLabel,
  savePost,
  shareToGroup,
  toMediaView,
  unlikeComment,
  unlikePost,
  unsavePost,
  uploadMedia,
  type Comment,
  type CommentCursor,
  type CommentThread,
  type MediaView,
  type PostItem,
  type ReportCategory,
  type ReportTargetType,
} from "@safeplace/api-client";
import { canSharePostInternally, type Gender, type GroupVisibility } from "@safeplace/visibility-policy";
import type { IconName, SourceLabelKind } from "@safeplace/ui";
import { ICON_NAMES } from "@safeplace/ui";

/**
 * The screen's data layer. `PostBackend` is the seam: the real implementation
 * talks to Supabase through @safeplace/api-client (RLS decides existence, the
 * visibility rules come from visibility-policy via api-client), and a
 * dev-only fixture implementation feeds the lab scenes for pixel checks. This
 * file makes no visibility decision of its own.
 */

/** NOT-IN-LAB / open: the public host for copied links is undecided (legal #13). */
export const SHARE_BASE_URL = process.env.EXPO_PUBLIC_SHARE_BASE_URL ?? "https://safe-place.app";

export interface SourceView {
  kind: SourceLabelKind;
  name?: string;
  color?: string;
  icon?: IconName;
}

export interface ShareTarget {
  id: string;
  name: string;
  color?: string;
  icon?: IconName;
}

export type QuoteView =
  | { state: "available"; id: string; authorName: string; createdAt: string; text: string }
  | { state: "unavailable" };

export interface PostView {
  post: PostItem;
  authorName: string;
  source?: SourceView;
  /** Media with signed URLs resolved; a filtered item carries no path. */
  media: MediaView[];
  quote: QuoteView | null;
  /** From visibility-policy canCopyExternalLink (via getCopyLink); null = not allowed. */
  copyLink: string | null;
  /** Groups the viewer may share this post into, per canSharePostInternally. */
  shareTargets: ShareTarget[];
}

export interface ScreenData {
  viewerId: string;
  viewerName: string;
  viewerGender: Gender;
  /** null = not visible to the viewer (deleted / hidden / blocked are indistinguishable). */
  post: PostView | null;
}

export interface CommentsPageView {
  threads: CommentThread[];
  nextCursor: CommentCursor | null;
  /** userId -> display name for every author / mention in `threads`. */
  names: Record<string, string>;
}

export interface OutgoingImage {
  uri: string;
  contentType: string;
}

export interface SendCommentParams {
  postId: string;
  text: string;
  /** The level-1 comment to reply under (the screen resolves the thread root), or null. */
  parentCommentId: string | null;
  replyToUserId: string | null;
  image: OutgoingImage | null;
}

export interface PostBackend {
  load(postId: string): Promise<ScreenData>;
  loadComments(postId: string, cursor: CommentCursor | null): Promise<CommentsPageView>;
  /** Current media (resolved, signed) of some of the viewer's own comments, to follow classification. */
  refreshCommentMedia(commentIds: string[]): Promise<Map<string, MediaView[]>>;
  setPostLiked(postId: string, liked: boolean): Promise<void>;
  setPostSaved(postId: string, saved: boolean): Promise<void>;
  setCommentLiked(commentId: string, liked: boolean): Promise<void>;
  sendComment(p: SendCommentParams): Promise<Comment>;
  mute(userId: string): Promise<void>;
  report(target: { type: ReportTargetType; id: string }, category: ReportCategory, details: string): Promise<void>;
  shareToGroup(postId: string, groupId: string): Promise<void>;
  removeMedia(mediaId: string): Promise<void>;
  appeal(mediaId: string): Promise<void>;
}

// --- helpers ---------------------------------------------------------------------

async function fetchDisplayNames(supabase: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  if (error) throw new Error(`fetchDisplayNames: ${error.message}`);
  for (const r of (data ?? []) as Array<{ id: string; display_name: string }>) out[r.id] = r.display_name;
  return out;
}

const asIcon = (v: string | null | undefined): IconName | undefined =>
  v && (ICON_NAMES as string[]).includes(v) ? (v as IconName) : undefined;

interface GroupRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  visibility: GroupVisibility;
}

async function fetchGroups(supabase: SupabaseClient, ids: string[]): Promise<GroupRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("groups").select("id, name, color, icon, visibility").in("id", ids);
  if (error) throw new Error(`fetchGroups: ${error.message}`);
  return (data ?? []) as GroupRow[];
}

async function sourceViewOf(supabase: SupabaseClient, post: PostItem, viewerId: string): Promise<SourceView | undefined> {
  const label = resolveSourceLabel(post, viewerId);
  if (label.kind === "public") return { kind: "public" };
  if (label.kind === "followers") return { kind: "followers" };
  if (label.kind === "group") {
    const g = (await fetchGroups(supabase, [label.groupId]))[0];
    return { kind: "group", name: g?.name, color: g?.color ?? undefined, icon: asIcon(g?.icon) };
  }
  const { data } = await supabase.from("family_spaces").select("name").eq("id", label.spaceId).maybeSingle();
  return { kind: "family_space", name: (data as { name: string } | null)?.name };
}

// --- the Supabase backend --------------------------------------------------------

export function createSupabaseBackend(supabase: SupabaseClient, userId: string): PostBackend {
  return {
    async load(postId) {
      const [viewer, post] = await Promise.all([buildViewerContext(supabase, userId), fetchPost(supabase, postId)]);
      const me = (await fetchDisplayNames(supabase, [userId]))[userId] ?? "";
      const base = { viewerId: userId, viewerName: me, viewerGender: viewer.gender };
      if (!post) return { ...base, post: null };

      const quoted = post.quotedPostId ? await fetchQuotedPost(supabase, post.quotedPostId) : null;
      const names = await fetchDisplayNames(supabase, [post.authorId, ...(quoted?.state === "available" ? [quoted.post.authorId] : [])]);
      const [media, source] = await Promise.all([resolveMediaUrls(supabase, post.media), sourceViewOf(supabase, post, userId)]);

      const ctx = postContextOf(post);
      const groups = await fetchGroups(supabase, [...viewer.groupMemberships]);
      const visibility = new Map(groups.map((g) => [g.id, g.visibility] as const));
      const shareTargets = ctx
        ? groups
            .filter((g) => canSharePostInternally(viewer, ctx, g.id, visibility))
            .map((g) => ({ id: g.id, name: g.name, color: g.color ?? undefined, icon: asIcon(g.icon) }))
        : [];

      return {
        ...base,
        post: {
          post,
          authorName: names[post.authorId] ?? "",
          source,
          media,
          quote:
            quoted === null
              ? null
              : quoted.state === "unavailable"
                ? { state: "unavailable" }
                : {
                    state: "available",
                    id: quoted.post.id,
                    authorName: names[quoted.post.authorId] ?? "",
                    createdAt: quoted.post.publishedAt ?? quoted.post.createdAt,
                    text: quoted.post.text,
                  },
          copyLink: getCopyLink(viewer, post, SHARE_BASE_URL),
          shareTargets,
        },
      };
    },

    async loadComments(postId, cursor) {
      const page = await fetchComments(supabase, postId, { cursor });
      const all = page.threads.flatMap((t) => [t.comment, ...t.replies]);
      const urls = await resolveMediaUrls(supabase, all.flatMap((c) => c.media));
      const byId = new Map(urls.map((m) => [m.id, m]));
      const withUrls = (c: Comment): Comment => ({ ...c, media: c.media.map((m) => byId.get(m.id) ?? m) });
      const names = await fetchDisplayNames(supabase, all.flatMap((c) => [c.authorId, ...(c.replyToUserId ? [c.replyToUserId] : [])]));
      return {
        threads: page.threads.map((t) => ({ comment: withUrls(t.comment), replies: t.replies.map(withUrls) })),
        nextCursor: page.nextCursor,
        names,
      };
    },

    async refreshCommentMedia(commentIds) {
      const out = new Map<string, MediaView[]>();
      if (commentIds.length === 0) return out;
      const { data, error } = await supabase
        .from("media_items_visible")
        .select(`id, comment_id, classification, ${LEVEL_COLUMNS}, storage_path, is_filtered, is_redacted`)
        .in("comment_id", commentIds);
      if (error) throw new Error(`refreshCommentMedia: ${error.message}`);
      const rows = (data ?? []) as Array<Parameters<typeof toMediaView>[0] & { comment_id: string }>;
      const resolved = await resolveMediaUrls(supabase, rows.map(toMediaView));
      rows.forEach((r, i) => {
        const list = out.get(r.comment_id) ?? [];
        list.push(resolved[i] as MediaView);
        out.set(r.comment_id, list);
      });
      return out;
    },

    setPostLiked: (postId, liked) => (liked ? likePost(supabase, userId, postId) : unlikePost(supabase, userId, postId)),
    setPostSaved: (postId, saved) => (saved ? savePost(supabase, userId, postId) : unsavePost(supabase, userId, postId)),
    setCommentLiked: (id, liked) => (liked ? likeComment(supabase, userId, id) : unlikeComment(supabase, userId, id)),

    async sendComment(p) {
      let media: Array<{ storagePath: string; contentType: string }> = [];
      if (p.image) {
        // Upload accepted at once; the media row goes in 'unclassified' and the
        // insert trigger enqueues classification (wire-moderation). Never awaited.
        const blob = await (await fetch(p.image.uri)).blob();
        const { storagePath } = await uploadMedia(supabase, { uploaderId: userId, data: blob, contentType: p.image.contentType });
        media = [{ storagePath, contentType: p.image.contentType }];
      }
      const { commentId, mediaIds } = await addComment(supabase, {
        authorId: userId,
        postId: p.postId,
        text: p.text,
        parentCommentId: p.parentCommentId,
        media,
      });
      return {
        id: commentId,
        postId: p.postId,
        authorId: userId,
        parentCommentId: p.parentCommentId,
        replyToUserId: p.replyToUserId,
        text: p.text,
        createdAt: new Date().toISOString(),
        editedAt: null,
        likeCount: 0,
        viewerLiked: false,
        // The author sees their own picture at once; the classification state follows by polling.
        media: mediaIds.map((id) => ({
          id,
          classification: "unclassified" as const,
          filtered: false,
          redacted: false,
          levels: null,
          storagePath: null,
          url: p.image?.uri ?? null,
        })),
      };
    },

    mute: (id) => muteUser(supabase, userId, id),
    report: (target, category, details) =>
      reportContent(supabase, {
        reporterId: userId,
        targetType: target.type,
        targetId: target.id,
        category,
        explanation: details.trim() || null,
      }),
    shareToGroup: async (postId, groupId) => {
      await shareToGroup(supabase, { authorId: userId, quotedPostId: postId, groupId });
    },
    removeMedia: (id) => removeMedia(supabase, id),
    appeal: async (id) => {
      await appealClassification(supabase, id);
    },
  };
}
