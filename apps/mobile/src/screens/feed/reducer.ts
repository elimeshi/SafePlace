import type { FeedCursor } from "@safeplace/api-client";
import type { FeedEntry } from "./types";

export interface FeedState {
  phase: "loading" | "ready" | "error";
  seed: string;
  entries: FeedEntry[];
  /** Just-published posts of this session, pinned above the random order. */
  pinned: FeedEntry[];
  cursor: FeedCursor | null;
  /** true once a page came back without a cursor (see the shortcut note in api-client fetchFeedPage). */
  end: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  /** Post ids whose uploader notice was acknowledged ("Understood"). */
  noticeDismissed: string[];
}

export type FeedAction =
  | { type: "refreshStart"; seed: string }
  | { type: "loaded"; seed: string; entries: FeedEntry[]; cursor: FeedCursor | null }
  | { type: "failed" }
  | { type: "moreStart" }
  | { type: "moreLoaded"; entries: FeedEntry[]; cursor: FeedCursor | null }
  | { type: "moreFailed" }
  | { type: "pin"; entries: FeedEntry[] }
  | { type: "toggleLike"; postId: string }
  | { type: "toggleSave"; postId: string }
  /** Mute hides all of an author's posts; dont-suggest / less-like-this only their suggested ones. */
  | { type: "removeAuthor"; authorId: string; onlySuggested: boolean }
  | { type: "dropSuggested" }
  | { type: "dismissNotice"; postId: string }
  | { type: "mediaRemoved"; postId: string; mediaId: string };

export const initialFeedState = (seed: string): FeedState => ({
  phase: "loading",
  seed,
  entries: [],
  pinned: [],
  cursor: null,
  end: false,
  loadingMore: false,
  refreshing: false,
  noticeDismissed: [],
});

const mapEntry = (s: FeedState, postId: string, f: (e: FeedEntry) => FeedEntry): FeedState => ({
  ...s,
  entries: s.entries.map((e) => (e.item.id === postId ? f(e) : e)),
  pinned: s.pinned.map((e) => (e.item.id === postId ? f(e) : e)),
});

function withStats(e: FeedEntry, patch: (st: NonNullable<FeedEntry["item"]["stats"]>) => NonNullable<FeedEntry["item"]["stats"]>): FeedEntry {
  return e.item.stats ? { ...e, item: { ...e.item, stats: patch(e.item.stats) } } : e;
}

const keep = (p: FeedEntry[], fn: (e: FeedEntry) => boolean) => p.filter(fn);

export function feedReducer(s: FeedState, a: FeedAction): FeedState {
  switch (a.type) {
    case "refreshStart":
      return { ...s, seed: a.seed, refreshing: true, phase: s.phase === "error" ? "loading" : s.phase };
    case "loaded":
      return {
        ...s,
        phase: "ready",
        seed: a.seed,
        entries: a.entries,
        cursor: a.cursor,
        end: a.cursor === null,
        loadingMore: false,
        refreshing: false,
      };
    case "failed":
      // A failed refresh keeps what is on screen; only a failed first load is the error state.
      return s.entries.length > 0 || s.pinned.length > 0
        ? { ...s, refreshing: false }
        : { ...s, phase: "error", refreshing: false };
    case "moreStart":
      return { ...s, loadingMore: true };
    case "moreLoaded": {
      const have = new Set(s.entries.map((e) => e.item.id));
      return {
        ...s,
        entries: [...s.entries, ...a.entries.filter((e) => !have.has(e.item.id))],
        cursor: a.cursor,
        end: a.cursor === null,
        loadingMore: false,
      };
    }
    case "moreFailed":
      return { ...s, loadingMore: false };
    case "pin": {
      const have = new Set(s.pinned.map((e) => e.item.id));
      const fresh = a.entries.filter((e) => !have.has(e.item.id));
      return fresh.length ? { ...s, phase: "ready", pinned: [...fresh, ...s.pinned] } : s;
    }
    case "toggleLike":
      return mapEntry(s, a.postId, (e) =>
        withStats(e, (st) => ({
          ...st,
          viewerLiked: !st.viewerLiked,
          likeCount: Math.max(0, st.likeCount + (st.viewerLiked ? -1 : 1)),
        }))
      );
    case "toggleSave":
      return mapEntry(s, a.postId, (e) => withStats(e, (st) => ({ ...st, viewerSaved: !st.viewerSaved })));
    case "removeAuthor": {
      const drop = (e: FeedEntry) => e.item.authorId === a.authorId && (!a.onlySuggested || e.item.placement === "suggested");
      return { ...s, entries: keep(s.entries, (e) => !drop(e)), pinned: keep(s.pinned, (e) => !drop(e)) };
    }
    case "dropSuggested":
      return { ...s, entries: keep(s.entries, (e) => e.item.placement !== "suggested") };
    case "dismissNotice":
      return { ...s, noticeDismissed: [...s.noticeDismissed, a.postId] };
    case "mediaRemoved":
      return mapEntry(s, a.postId, (e) => ({
        ...e,
        item: { ...e.item, media: e.item.media.filter((m) => m.id !== a.mediaId) },
        uploaderMedia: e.uploaderMedia ? e.uploaderMedia.filter((m) => m.id !== a.mediaId) : null,
      }));
  }
}

/** What the list renders: pinned first, then the server order, each post once. */
export function visibleEntries(s: FeedState): FeedEntry[] {
  const pinnedIds = new Set(s.pinned.map((e) => e.item.id));
  return [...s.pinned, ...s.entries.filter((e) => !pinnedIds.has(e.item.id))];
}
