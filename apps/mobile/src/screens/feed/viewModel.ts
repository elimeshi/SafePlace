import type { MediaView } from "@safeplace/api-client";
import type { IconName, PostCardData, PostCardSource } from "@safeplace/ui";
import { relativeTime } from "./time";
import type { EntryLabel, FeedEntry, SpaceCardVM } from "./types";

/**
 * Pure mappers from hydrated feed entries to component props. No visibility
 * decision is made here: `filtered` / `url` were already resolved by RLS and
 * the api-client (a filtered media view has no path and no url).
 */

export const FOLD_AT_CHARS = 300;
export const FOLD_LINES = 5;

export interface MapOptions {
  now: number;
  /** Narrowing guard for the icon names the UI kit has glyphs for. */
  isIcon: (s: string) => s is IconName;
}

export function sourceProps(label: EntryLabel, o: MapOptions): PostCardSource {
  if (label.kind === "group" || label.kind === "family_space") {
    return {
      kind: label.kind,
      name: label.name,
      color: label.color ?? undefined,
      icon: label.icon && o.isIcon(label.icon) ? label.icon : undefined,
    };
  }
  return { kind: label.kind };
}

export type StripKind = "processing" | "review" | "notice";

/** The strip under the author's own media. Priority: still processing > under review > the neutral notice. */
export function stripKindOf(entry: FeedEntry, noticeDismissed: readonly string[]): StripKind | null {
  const states = entry.uploaderMedia;
  if (!states || states.length === 0) return null;
  if (states.some((m) => m.state === "processing")) return "processing";
  if (states.some((m) => m.state === "under_review")) return "review";
  if (states.some((m) => m.state === "filtered_for_some_viewers") && !noticeDismissed.includes(entry.item.id)) {
    return "notice";
  }
  return null;
}

/** The first media is the card's media; a filtered one becomes the placeholder and carries no url. */
export function primaryMedia(media: readonly MediaView[]): { filtered: boolean; url: string | null; hasMedia: boolean } {
  const first = media[0];
  if (!first) return { filtered: false, url: null, hasMedia: false };
  if (first.filtered) return { filtered: true, url: null, hasMedia: true };
  return { filtered: false, url: first.url, hasMedia: first.url !== null };
}

export interface CardProps {
  data: PostCardData;
  filtered: boolean;
  hasMedia: boolean;
  strip: StripKind | null;
  foldable: boolean;
}

export function toCardProps(entry: FeedEntry, noticeDismissed: readonly string[], o: MapOptions): CardProps {
  const { item } = entry;
  const m = primaryMedia(item.media);
  return {
    data: {
      author: { name: entry.authorName },
      time: relativeTime(item.publishedAt ?? item.createdAt, o.now),
      source: sourceProps(entry.label, o),
      body: item.text || undefined,
      location: item.locationTag ?? undefined,
      media: m.url ?? undefined,
      likes: item.stats?.likeCount ?? 0,
      comments: item.stats?.commentCount ?? 0,
      liked: item.stats?.viewerLiked ?? false,
      saved: item.stats?.viewerSaved ?? false,
    },
    filtered: m.filtered,
    hasMedia: m.hasMedia,
    strip: stripKindOf(entry, noticeDismissed),
    foldable: item.text.length > FOLD_AT_CHARS,
  };
}

export function toSpaceProps(c: SpaceCardVM, o: MapOptions) {
  const m = c.media ? primaryMedia([c.media]) : null;
  return {
    kind: c.kind,
    name: c.name,
    color: c.color ?? undefined,
    icon: c.icon && o.isIcon(c.icon) ? c.icon : undefined,
    previewText: c.previewText,
    filtered: m?.filtered ?? false,
    mediaUrl: m?.url ?? null,
    lastAuthor: c.lastAuthor,
    time: relativeTime(c.publishedAt, o.now),
  };
}
