import type { ReactNode } from "react";
import { Image, Pressable, Text, View, type ViewStyle } from "react-native";
import { theme } from "../theme";
import { Avatar } from "../content/Avatar";
import { FilteredMedia } from "../content/FilteredMedia";
import { Icon, type IconName } from "../content/Icon";
import { InteractionBar } from "../content/InteractionBar";
import { SourceLabel, type SourceLabelKind } from "../content/SourceLabel";
import { contentCopy } from "../content/copy";
import {
  POST_AVATAR_SIZE,
  POST_DETAIL_AVATAR_SIZE,
  POST_MEDIA_HEIGHT,
  postCardMediaMode,
  resolveCardStyle,
  resolvePostCardParts,
} from "./PostCard.styles";

export interface PostCardAuthor {
  name: string;
  avatar?: string;
}

export interface PostCardSource {
  kind: SourceLabelKind;
  name?: string;
  color?: string;
  icon?: IconName;
}

export interface PostCardData {
  author: PostCardAuthor;
  time: string;
  source?: PostCardSource;
  body?: string;
  /** Place name only — never coordinates (02 §3.5). */
  location?: string;
  /** Image URI (already signed; never present for filtered media). */
  media?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  saved?: boolean;
}

export interface PostCardProps {
  post: PostCardData;
  /**
   * Render the filtered-media placeholder instead of the media. UI
   * defense-in-depth only — the caller sets this from packages/visibility-policy
   * / RLS; the card never makes the visibility decision (invariant #2).
   */
  filtered?: boolean;
  /** "detail" = the single-post article (no card chrome, 44px avatar, post-style action bar). */
  variant?: "card" | "detail";
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  filteredLabel?: string;
  filteredHint?: string;
  /** Replaces the <Image> (e.g. a local stand-in); still treated as "has media". */
  mediaSlot?: ReactNode;
  mediaHeight?: number;
  /** Strip under the media: <StateStrip> / <UploaderNotice mode="afterPublish">. */
  stateStrip?: ReactNode;
  /** Quote post: shows the "shared a post" row and embeds the original (<QuoteCard>). */
  quote?: ReactNode;
  sharedByLabel?: string;
  /** Long bodies fold to this many lines with `readMoreLabel` (no default copy in the lab — pass both). */
  bodyLines?: number;
  readMoreLabel?: string;
  onReadMore?: () => void;
  onPress?: () => void;
  onPressAuthor?: () => void;
  onPressSource?: () => void;
  onMore?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  moreLabel?: string;
  style?: ViewStyle;
}

/**
 * PostCard — the core feed unit (feed-spec §4, lab `.card.soft`). Text is
 * never filtered — only media becomes the placeholder — so a filtered post
 * still shows author, time, source, and body. Likes are a number only.
 */
export function PostCard({
  post,
  filtered = false,
  variant = "card",
  filteredLabel = contentCopy.filteredLabel,
  filteredHint = contentCopy.filteredHint,
  mediaSlot,
  mediaHeight = POST_MEDIA_HEIGHT,
  stateStrip,
  quote,
  sharedByLabel = contentCopy.sharedBy,
  bodyLines,
  readMoreLabel,
  onReadMore,
  onPress,
  onPressAuthor,
  onPressSource,
  onMore,
  onLike,
  onComment,
  onShare,
  onSave,
  moreLabel = contentCopy.moreA11y,
  style,
}: PostCardProps) {
  const p = resolvePostCardParts();
  // A filtered item never carries a url or slot (invariant #2), so `filtered` itself says "there is media, withheld".
  const mediaMode = postCardMediaMode({ hasMedia: Boolean(post.media) || mediaSlot != null || filtered, filtered });

  return (
    <View style={[resolveCardStyle(variant), style]} testID="post-card">
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined}>
        <View style={p.header}>
          <Pressable onPress={onPressAuthor} disabled={!onPressAuthor}>
            <Avatar src={post.author.avatar} name={post.author.name} size={variant === "detail" ? POST_DETAIL_AVATAR_SIZE : POST_AVATAR_SIZE} />
          </Pressable>
          <View style={p.who}>
            <View style={p.nameRow}>
              <Pressable onPress={onPressAuthor} disabled={!onPressAuthor}>
                <Text style={p.name}>{post.author.name}</Text>
              </Pressable>
              <Text style={p.time}>{post.time}</Text>
            </View>
            {post.source ? (
              <Pressable onPress={onPressSource} disabled={!onPressSource} style={{ alignSelf: "flex-start" }}>
                <SourceLabel {...post.source} />
              </Pressable>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={moreLabel} onPress={onMore} style={p.more} testID="post-more">
            <Icon name="more-horizontal" size={22} color={theme.colors.ink400} />
          </Pressable>
        </View>

        {quote ? (
          <View style={p.sharedBy}>
            <Icon name="share" size={14} color={theme.colors.ink400} />
            <Text style={p.sharedByText}>{sharedByLabel}</Text>
          </View>
        ) : null}

        {post.body ? (
          <View>
            <Text style={p.body} numberOfLines={bodyLines}>
              {post.body}
            </Text>
            {bodyLines && readMoreLabel ? (
              <Pressable onPress={onReadMore}>
                <Text style={[p.body, p.readMore, { marginTop: -8 }]}>{readMoreLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {post.location ? (
          <View style={p.location}>
            <Icon name="map-pin" size={15} color={theme.colors.ink500} />
            <Text style={p.locationText}>{post.location}</Text>
          </View>
        ) : null}
      </Pressable>

      {quote}

      {mediaMode === "image" ? (
        <View style={[p.mediaGround, { height: mediaHeight }]} testID="post-media">
          {mediaSlot ?? (
            <Image source={{ uri: post.media }} style={{ width: "100%", height: mediaHeight }} resizeMode="cover" />
          )}
        </View>
      ) : null}
      {mediaMode === "filtered" ? (
        <FilteredMedia label={filteredLabel} hint={filteredHint} />
      ) : null}

      {stateStrip}

      <InteractionBar
        likes={post.likes ?? 0}
        comments={post.comments ?? 0}
        liked={post.liked}
        saved={post.saved}
        variant={variant === "detail" ? "post" : "card"}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onSave={onSave}
      />
    </View>
  );
}
