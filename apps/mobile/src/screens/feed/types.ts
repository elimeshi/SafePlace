import type { FeedItem, MediaView, PostItem, UploaderMediaView } from "@safeplace/api-client";

/** Presentation facts about a post's source, resolved once at load time (no policy decision here). */
export type EntryLabel =
  | { kind: "group" | "family_space"; name: string; color: string | null; icon: string | null; targetId: string }
  | { kind: "public" | "followers" | "suggested" };

export type EntryQuote =
  | { state: "unavailable" }
  | { state: "available"; post: PostItem; authorName: string };

export interface FeedEntry {
  item: FeedItem;
  authorName: string;
  label: EntryLabel;
  quote: EntryQuote | null;
  /** Only for the viewer's own posts: how their media is progressing (via visibility-policy). */
  uploaderMedia: UploaderMediaView[] | null;
}

export interface SpaceCardVM {
  id: string;
  kind: "group" | "family_space";
  name: string;
  color: string | null;
  icon: string | null;
  previewText: string;
  media: MediaView | null;
  lastAuthor: string;
  /** ISO publish time; formatted by the view model. */
  publishedAt: string | null;
}

export interface FollowItemVM {
  userId: string;
  name: string;
  /** Not provided by the api-client yet (fixtures only); the card keeps the line's height. */
  bio?: string;
  followers?: number;
}
