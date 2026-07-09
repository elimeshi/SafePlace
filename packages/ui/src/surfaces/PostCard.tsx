import type { ViewStyle } from "react-native";
import { Image, Text, View } from "react-native";
import { theme } from "../theme";
import { Avatar } from "../content/Avatar";
import { Icon, type IconName } from "../content/Icon";
import { InteractionBar } from "../content/InteractionBar";
import { SourceLabel } from "../content/SourceLabel";
import { postCardMediaMode, resolveCardStyle } from "./PostCard.styles";

export interface PostCardAuthor {
  name: string;
  avatar?: string;
}

export interface PostCardSource {
  kind: "group" | "public" | "suggested";
  name?: string;
  color?: string;
  icon?: IconName;
}

export interface PostCardData {
  author: PostCardAuthor;
  time: string;
  source?: PostCardSource;
  body?: string;
  /** Image URI. */
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
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  filteredLabel?: string;
  filteredHint?: string;
  style?: ViewStyle;
}

/**
 * PostCard — the core feed unit (master §5.2, feed-spec §4). Composes Avatar,
 * SourceLabel, and InteractionBar. Text is never filtered — only media becomes
 * the placeholder — so a filtered post still shows author, time, source, and
 * body.
 */
export function PostCard({
  post,
  filtered = false,
  filteredLabel = "מדיה מסוננת לפי ההעדפות שלך",
  filteredHint = "ניתן לשנות את העדפות הצריכה באזור האישי בכל עת.",
  style,
}: PostCardProps) {
  const mediaMode = postCardMediaMode({ hasMedia: Boolean(post.media), filtered });

  return (
    <View style={[resolveCardStyle(), style]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        <Avatar src={post.author.avatar} name={post.author.name} size={44} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: theme.spacing.sm }}>
            <Text style={{ ...theme.typeRole.bodyStrong, color: theme.colors.textPrimary }}>
              {post.author.name}
            </Text>
            <Text style={{ ...theme.typeRole.meta, color: theme.colors.ink400 }}>· {post.time}</Text>
          </View>
          {post.source ? <SourceLabel {...post.source} /> : null}
        </View>
        <Icon name="more-horizontal" size={20} color={theme.colors.ink400} />
      </View>

      {/* Body */}
      {post.body ? (
        <Text
          style={{
            ...theme.typeRole.body,
            color: theme.colors.textPrimary,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          }}
        >
          {post.body}
        </Text>
      ) : null}

      {/* Media */}
      {mediaMode === "image" && post.media ? (
        <Image source={{ uri: post.media }} style={{ width: "100%", height: 240 }} resizeMode="cover" />
      ) : null}
      {mediaMode === "filtered" ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing["3xl"],
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: theme.colors.blue050,
          }}
        >
          <Icon name="eye" size={26} color={theme.colors.blue400} />
          <Text style={{ ...theme.typeRole.bodyStrong, color: theme.colors.textPrimary, textAlign: "center" }}>
            {filteredLabel}
          </Text>
          <Text
            style={{
              ...theme.typeRole.meta,
              color: theme.colors.textSecondary,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {filteredHint}
          </Text>
        </View>
      ) : null}

      {/* Interactions */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.ink100,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <InteractionBar
          likes={post.likes ?? 0}
          comments={post.comments ?? 0}
          liked={post.liked}
          saved={post.saved}
        />
      </View>
    </View>
  );
}
