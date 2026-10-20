import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { contentCopy } from "./copy";
import {
  interactionIconState,
  resolveActionStyle,
  resolveBarStyle,
  resolveCountStyle,
  spacerStyle,
  type InteractionBarVariant,
} from "./InteractionBar.styles";

export interface InteractionBarProps {
  /** Number only. Never a list and never separately tappable (invariant #5). */
  likes: number;
  comments: number;
  liked?: boolean;
  saved?: boolean;
  /** "card" = feed card row; "post" = single-post bar with a share label. */
  variant?: InteractionBarVariant;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  likeLabel?: string;
  commentLabel?: string;
  shareLabel?: string;
  saveLabel?: string;
  /** Visible share text in the "post" variant. */
  shareText?: string;
}

interface ActionProps {
  iconName: "heart" | "comment" | "share" | "bookmark";
  label: string;
  count?: number;
  color: string;
  filled?: boolean;
  selected?: boolean;
  text?: string;
  variant: InteractionBarVariant;
  onPress?: () => void;
  testID?: string;
}

function Action({ iconName, label, count, color, filled, selected, text, variant, onPress, testID }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected == null ? undefined : { selected }}
      onPress={onPress}
      style={resolveActionStyle(variant)}
      testID={testID}
    >
      <Icon name={iconName} size={22} color={color} filled={filled} />
      {count != null ? <Text style={[resolveCountStyle(variant), { color }]}>{count}</Text> : null}
      {text ? <Text style={[resolveCountStyle(variant), { color }]}>{text}</Text> : null}
    </Pressable>
  );
}

/**
 * InteractionBar — the minimal action row of a post (feed-spec §4.1, lab
 * `.ibar` / `.pbar`). A like is one toggle: icon and number together; the
 * number is not a separate control (no "who liked" list, plan §2). RTL:
 * `flexDirection: "row"` mirrors, so like/comment/share sit at the start and
 * save at the far end with no left/right logic here.
 */
export function InteractionBar({
  likes,
  comments,
  liked = false,
  saved = false,
  variant = "card",
  onLike,
  onComment,
  onShare,
  onSave,
  likeLabel = contentCopy.likeA11y,
  commentLabel = contentCopy.commentA11y,
  shareLabel = contentCopy.shareA11y,
  saveLabel = contentCopy.saveA11y,
  shareText = contentCopy.shareLabel,
}: InteractionBarProps) {
  const s = interactionIconState({ liked, saved });
  return (
    <View style={resolveBarStyle(variant)} testID="interaction-bar">
      <Action iconName="heart" label={likeLabel} count={likes} color={s.heartColor} filled={s.heartFilled} selected={liked} variant={variant} onPress={onLike} testID="like" />
      <Action iconName="comment" label={commentLabel} count={comments} color={s.iconNeutral} variant={variant} onPress={onComment} testID="comment" />
      <Action iconName="share" label={shareLabel} color={s.iconNeutral} text={variant === "post" ? shareText : undefined} variant={variant} onPress={onShare} testID="share" />
      {variant === "card" ? (
        <>
          <View style={spacerStyle} />
          <Action iconName="bookmark" label={saveLabel} color={s.bookmarkColor} filled={s.bookmarkFilled} selected={saved} variant={variant} onPress={onSave} testID="save" />
        </>
      ) : null}
    </View>
  );
}
