import { useState } from "react";
import { Image } from "react-native";
import {
  FilteredMedia,
  ICON_NAMES,
  PostCard,
  QuoteCard,
  StateStrip,
  UploaderNotice,
  contentCopy,
  type IconName,
} from "@safeplace/ui";
import { contentNoticeProps } from "@/lib/contentNotice";
import { feedScreenCopy } from "./copy";
import { fixtureMediaSlot } from "./fixtures";
import { FOLD_LINES, primaryMedia, toCardProps, type MapOptions } from "./viewModel";
import { relativeTime } from "./time";
import type { FeedEntry } from "./types";

export const isIcon = (s: string): s is IconName => (ICON_NAMES as readonly string[]).includes(s);

export interface FeedPostActions {
  open: (postId: string) => void;
  openAuthor: (authorId: string) => void;
  openSource: (entry: FeedEntry) => void;
  more: (entry: FeedEntry) => void;
  like: (postId: string) => void;
  save: (postId: string) => void;
  share: (entry: FeedEntry) => void;
  dismissNotice: (postId: string) => void;
  removeMedia: (entry: FeedEntry) => void;
  appeal: (entry: FeedEntry) => void;
}

/** One feed card: maps an entry onto the UI kit's PostCard. No visibility decision is made here. */
export function FeedPost({
  entry,
  noticeDismissed,
  actions,
  now,
  mediaHeight,
}: {
  entry: FeedEntry;
  noticeDismissed: readonly string[];
  actions: FeedPostActions;
  now: number;
  mediaHeight?: number;
}) {
  const [unfolded, setUnfolded] = useState(false);
  const o: MapOptions = { now, isIcon };
  const c = toCardProps(entry, noticeDismissed, o);
  const id = entry.item.id;
  const sourceTappable = entry.label.kind === "group" || entry.label.kind === "family_space";

  const strip =
    c.strip === "processing" || c.strip === "review" ? (
      <StateStrip kind={c.strip} />
    ) : c.strip === "notice" ? (
      <UploaderNotice
        mode="afterPublish"
        {...contentNoticeProps(c.noticeGroups)}
        onUnderstood={() => actions.dismissNotice(id)}
        onRemoveMedia={() => actions.removeMedia(entry)}
        onAppeal={() => actions.appeal(entry)}
      />
    ) : undefined;

  const q = entry.quote;
  let quote;
  if (q?.state === "unavailable") quote = <QuoteCard state="unavailable" />;
  else if (q?.state === "available") {
    const m = primaryMedia(q.post.media);
    quote = (
      <QuoteCard
        state="available"
        author={{ name: q.authorName }}
        time={relativeTime(q.post.publishedAt ?? q.post.createdAt, now)}
        body={q.post.text}
        onPress={() => actions.open(q.post.id)}
        media={
          m.filtered ? (
            <FilteredMedia height={120} label={contentCopy.filteredLabel} hint={null} />
          ) : m.url ? (
            (fixtureMediaSlot(m.url) ?? <Image source={{ uri: m.url }} style={{ width: "100%", height: 120 }} resizeMode="cover" />)
          ) : undefined
        }
      />
    );
  }

  return (
    <PostCard
      post={c.data}
      filtered={c.filtered}
      mediaSlot={fixtureMediaSlot(c.data.media) ?? undefined}
      mediaHeight={mediaHeight}
      stateStrip={strip}
      quote={quote}
      bodyLines={c.foldable && !unfolded ? FOLD_LINES : undefined}
      readMoreLabel={c.foldable && !unfolded ? feedScreenCopy.readMore : undefined}
      onReadMore={() => setUnfolded(true)}
      onPress={() => actions.open(id)}
      onPressAuthor={() => actions.openAuthor(entry.item.authorId)}
      onPressSource={sourceTappable ? () => actions.openSource(entry) : undefined}
      onMore={() => actions.more(entry)}
      onLike={() => actions.like(id)}
      onComment={() => actions.open(id)}
      onShare={() => actions.share(entry)}
      onSave={() => actions.save(id)}
    />
  );
}
