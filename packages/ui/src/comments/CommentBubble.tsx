import type { ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Avatar } from "../content/Avatar";
import { FilteredMedia } from "../content/FilteredMedia";
import { commentCopy } from "./copy";
import {
  COMMENT_MEDIA_HEIGHT,
  commentAvatarSize,
  moreCommentsStyle,
  resolveCommentStyle,
  type CommentLevel,
} from "./CommentBubble.styles";

export type { CommentLevel } from "./CommentBubble.styles";

export interface CommentBubbleProps {
  author: { name: string; avatar?: string };
  time: string;
  body: string;
  /** Level-2 replies address someone: renders the bold "@name" lead-in (03 §3.1, §3.3). */
  mention?: string;
  level?: CommentLevel;
  /** Number only — shown after "אהבתי" when > 0; never a list (invariant #5). */
  likes?: number;
  liked?: boolean;
  /** The comment being replied to (reply mode): cyan halo, "הגב" in primary. */
  highlighted?: boolean;
  /** Comment media: an image URI, already signed and never present when filtered. */
  mediaUri?: string;
  /** Media exists but the viewer's filter withholds it (caller decides via visibility-policy). The text stays visible. */
  mediaFiltered?: boolean;
  mediaSlot?: ReactNode;
  onLike?: () => void;
  onReply?: () => void;
  /** Opens the comment menu (report / mute; own: edit / delete greyed). */
  onLongPress?: () => void;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  likeLabel?: string;
  replyLabel?: string;
  filteredLabel?: string;
}

/** One comment (lab `.cmt`). */
export function CommentBubble({
  author,
  time,
  body,
  mention,
  level = 1,
  likes = 0,
  liked = false,
  highlighted = false,
  mediaUri,
  mediaFiltered = false,
  mediaSlot,
  onLike,
  onReply,
  onLongPress,
  likeLabel = commentCopy.like,
  replyLabel = commentCopy.reply,
  filteredLabel,
}: CommentBubbleProps) {
  const hasMedia = Boolean(mediaUri) || mediaFiltered || mediaSlot != null;
  const s = resolveCommentStyle({ level, highlighted, hasMedia });
  return (
    <View style={s.row} testID="comment">
      <Avatar name={author.name} src={author.avatar} size={commentAvatarSize(level)} />
      <View style={s.column}>
        <Pressable onLongPress={onLongPress} style={s.bubble} testID="comment-bubble">
          <Text style={s.name}>{author.name}</Text>
          <Text style={s.text}>
            {mention ? <Text style={s.mention}>{`@${mention}`}</Text> : null}
            {mention ? " " : ""}
            {body}
          </Text>
          {hasMedia ? (
            <View style={s.media}>
              {mediaFiltered ? (
                <FilteredMedia height={COMMENT_MEDIA_HEIGHT} hint={null} {...(filteredLabel ? { label: filteredLabel } : null)} />
              ) : (
                (mediaSlot ?? <Image source={{ uri: mediaUri }} style={{ width: "100%", height: COMMENT_MEDIA_HEIGHT }} resizeMode="cover" />)
              )}
            </View>
          ) : null}
        </Pressable>
        <View style={s.meta}>
          <Text style={s.metaText}>{time}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: liked }} onPress={onLike} testID="comment-like">
            <Text style={[s.metaText, liked ? s.metaActive : null]}>{likes > 0 ? `${likeLabel} · ${likes}` : likeLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onReply} testID="comment-reply">
            <Text style={[s.metaText, highlighted ? s.metaReply : null]}>{replyLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Lab `.more-cmts`: "load more comments" (20 top-level at a time, plan §2). */
export function MoreCommentsLink({ label = commentCopy.moreComments, onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={moreCommentsStyle.container} testID="more-comments">
      <Text style={moreCommentsStyle.text}>{label}</Text>
    </Pressable>
  );
}
