import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import {
  actionStyle,
  countStyle,
  interactionIconState,
  rowStyle,
  spacerStyle,
} from "./InteractionBar.styles";

export interface InteractionBarProps {
  likes: number;
  comments: number;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

interface ActionProps {
  iconName: "heart" | "comment" | "share" | "bookmark";
  label: string;
  count?: number;
  color: string;
  selected?: boolean;
  onPress?: () => void;
}

function Action({ iconName, label, count, color, selected, onPress }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected == null ? undefined : { selected }}
      onPress={onPress}
      style={actionStyle}
    >
      <Icon name={iconName} size={20} color={color} />
      {count != null && count > 0 ? (
        <Text style={[countStyle, { color }]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

/**
 * InteractionBar — the minimal action row at the bottom of a post card
 * (feed-spec §4.1, master §5.2.2). Deliberately restrained: like, comment,
 * share, save. No public like-count pressure beyond a quiet number
 * (CLAUDE.md §8 — no social-pressure UI). RTL: `flexDirection: "row"` is
 * mirrored globally, so like/comment/share read at the start of the row and
 * save sits at the far end without any left/right logic here.
 */
export function InteractionBar({
  likes,
  comments,
  liked = false,
  saved = false,
  onLike,
  onComment,
  onShare,
  onSave,
}: InteractionBarProps) {
  const { heartColor, bookmarkColor, iconNeutral } = interactionIconState({ liked, saved });

  return (
    <View style={rowStyle}>
      <Action
        iconName="heart"
        label="לייק"
        count={likes}
        color={heartColor}
        selected={liked}
        onPress={onLike}
      />
      <Action
        iconName="comment"
        label="תגובה"
        count={comments}
        color={iconNeutral}
        onPress={onComment}
      />
      <Action iconName="share" label="שיתוף" color={iconNeutral} onPress={onShare} />
      <View style={spacerStyle} />
      <Action
        iconName="bookmark"
        label="שמירה"
        color={bookmarkColor}
        selected={saved}
        onPress={onSave}
      />
    </View>
  );
}
