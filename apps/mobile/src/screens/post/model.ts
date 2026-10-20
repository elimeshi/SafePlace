import type { Comment, CommentCursor, CommentThread, MediaView } from "@safeplace/api-client";
import { resolveUploaderMediaViews } from "@safeplace/api-client";
import type { Gender } from "@safeplace/visibility-policy";

/**
 * Pure view-model helpers for the single-post screen. No visibility decision is
 * made here: filtering arrives already resolved (RLS / media_items_visible ->
 * `MediaView.filtered`), and the uploader's own media states come from
 * visibility-policy via api-client's resolveUploaderMediaViews.
 */

// --- relative time (lab: "לפני 40 דק׳", "לפני שעתיים", "אתמול") -------------------

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MIN) return "עכשיו";
  if (diff < HOUR) return `לפני ${Math.floor(diff / MIN)} דק׳`;
  if (diff < 2 * HOUR) return "לפני שעה";
  if (diff < 3 * HOUR) return "לפני שעתיים";
  if (diff < DAY) return `לפני ${Math.floor(diff / HOUR)} שעות`;
  if (diff < 2 * DAY) return "אתמול";
  if (diff < 7 * DAY) return `לפני ${Math.floor(diff / DAY)} ימים`;
  return new Date(iso).toLocaleDateString("he-IL");
}

// --- likes: a number and the viewer's own flag, nothing else ---------------------

export function toggleLiked<T extends { liked: boolean; likes: number }>(s: T): T {
  return { ...s, liked: !s.liked, likes: Math.max(0, s.likes + (s.liked ? -1 : 1)) };
}

// --- comments state --------------------------------------------------------------

export interface CommentsState {
  threads: CommentThread[];
  nextCursor: CommentCursor | null;
}

export type CommentsAction =
  | { type: "page"; threads: CommentThread[]; nextCursor: CommentCursor | null }
  | { type: "added"; comment: Comment }
  | { type: "liked"; commentId: string }
  | { type: "media"; commentId: string; media: MediaView[] }
  /** Mute: the author's comments leave this screen at once (the database hides them on the next load). */
  | { type: "hideAuthor"; userId: string };

export const emptyComments: CommentsState = { threads: [], nextCursor: null };

const mapComments = (s: CommentsState, f: (c: Comment) => Comment): CommentsState => ({
  ...s,
  threads: s.threads.map((t) => ({ comment: f(t.comment), replies: t.replies.map(f) })),
});

export function commentsReducer(s: CommentsState, a: CommentsAction): CommentsState {
  switch (a.type) {
    case "page": {
      const seen = new Set(s.threads.map((t) => t.comment.id));
      return { threads: [...s.threads, ...a.threads.filter((t) => !seen.has(t.comment.id))], nextCursor: a.nextCursor };
    }
    case "added": {
      const c = a.comment;
      if (!c.parentCommentId) return { ...s, threads: [...s.threads, { comment: c, replies: [] }] };
      // The caller passes the thread root as parent (rootOf): the database
      // re-parents a reply-to-a-reply there too (two levels, 03 §3.1).
      return {
        ...s,
        threads: s.threads.map((t) => (t.comment.id === c.parentCommentId ? { ...t, replies: [...t.replies, c] } : t)),
      };
    }
    case "liked":
      return mapComments(s, (c) =>
        c.id === a.commentId
          ? { ...c, viewerLiked: !c.viewerLiked, likeCount: toggleLiked({ liked: c.viewerLiked, likes: c.likeCount }).likes }
          : c
      );
    case "media":
      return mapComments(s, (c) => (c.id === a.commentId ? { ...c, media: a.media } : c));
    case "hideAuthor":
      return {
        ...s,
        threads: s.threads
          .filter((t) => t.comment.authorId !== a.userId)
          .map((t) => ({ ...t, replies: t.replies.filter((r) => r.authorId !== a.userId) })),
      };
  }
}

/** The level-1 comment a reply to `commentId` lands under (itself, or the root of the reply's thread). */
export function rootOf(threads: CommentThread[], commentId: string): string | null {
  for (const t of threads) {
    if (t.comment.id === commentId || t.replies.some((r) => r.id === commentId)) return t.comment.id;
  }
  return null;
}

/** The "@name" a level-2 reply shows: whom it answers (the root's author for a direct reply). */
export function mentionFor(reply: Comment, root: Comment, names: Record<string, string>): string | undefined {
  return names[reply.replyToUserId ?? root.authorId];
}

// --- the uploader's own media states (post and comment) --------------------------

export type OwnMediaStrip =
  | { kind: "none" }
  | { kind: "processing" }
  | { kind: "review" }
  | { kind: "notice"; mediaId: string };

const RANK = { none: 0, processing: 1, review: 2, notice: 3 } as const;

/**
 * Collapse the uploader's media states into the one strip to show. States come
 * from visibility-policy (resolveUploaderMediaState); a notice already
 * dismissed ("Understood") is skipped. Never a block (invariant #1).
 */
export function ownMediaStrip(media: MediaView[], gender: Gender, dismissed: ReadonlySet<string> = new Set()): OwnMediaStrip {
  let best: OwnMediaStrip = { kind: "none" };
  for (const v of resolveUploaderMediaViews(media, gender)) {
    const next: OwnMediaStrip =
      v.state === "processing"
        ? { kind: "processing" }
        : v.state === "under_review"
          ? { kind: "review" }
          : v.state === "filtered_for_some_viewers" && !dismissed.has(v.id)
            ? { kind: "notice", mediaId: v.id }
            : { kind: "none" };
    if (RANK[next.kind] > RANK[best.kind]) best = next;
  }
  return best;
}

/** True while any of the media is still waiting for the pipeline (keep polling). */
export const hasUnsettledMedia = (media: MediaView[]) => media.some((m) => m.classification === "unclassified");

// --- media props for the post / a comment ----------------------------------------

export interface MediaPresentation {
  kind: "none" | "image" | "filtered";
  url?: string;
  /** Another viewer's still-unclassified media: a neutral "processing" placeholder instead of the filtered one. */
  processing?: boolean;
}

/**
 * First media item as the card shows it. `filtered` is the API's resolved
 * answer (a filtered item never has a path); this only maps it.
 */
export function presentMedia(media: MediaView[], isAuthor: boolean): MediaPresentation {
  const m = media[0];
  if (!m) return { kind: "none" };
  if (m.filtered || !m.url) {
    return { kind: "filtered", processing: !isAuthor && m.classification === "unclassified" };
  }
  return { kind: "image", url: m.url };
}

// --- reporting -------------------------------------------------------------------

/** Order = ReportSheet's six categories (07-moderation §3.3). */
export const REPORT_CATEGORIES = [
  "contains_women",
  "harassment",
  "dangerous_content",
  "spam",
  "misinformation",
  "other",
] as const;
