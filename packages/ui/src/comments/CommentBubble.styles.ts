import type { TextStyle, ViewStyle } from "react-native";
import { feedColors } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab `.cmt` / `.bub` / `.meta` / `.cmt.hl` / `.l2`: a comment is an avatar
 * plus a soft bubble (name, text) with a quiet meta row (time, like, reply).
 * Two levels only (03 §3.1): level 2 is inset 42px and uses a 28px avatar.
 * The like count is a number inside the like control — never a list.
 */
export type CommentLevel = 1 | 2;

export const COMMENT_MEDIA_HEIGHT = 120;

export function commentAvatarSize(level: CommentLevel): number {
  return level === 2 ? 28 : 34;
}

export function resolveCommentStyle(args: { level: CommentLevel; highlighted: boolean; hasMedia: boolean }): {
  row: ViewStyle;
  column: ViewStyle;
  bubble: ViewStyle;
  name: TextStyle;
  text: TextStyle;
  mention: TextStyle;
  media: ViewStyle;
  meta: ViewStyle;
  metaText: TextStyle;
  metaActive: TextStyle;
  metaReply: TextStyle;
} {
  const { level, highlighted, hasMedia } = args;
  return {
    row: { flexDirection: "row", alignItems: "flex-start", gap: 9, ...(level === 2 ? { marginStart: 42 } : null) },
    column: { flexShrink: 1, alignItems: "stretch", ...(hasMedia ? { flex: 1, alignSelf: "stretch" } : null) },
    bubble: {
      backgroundColor: highlighted ? feedColors.replyHighlightBg : theme.colors.background,
      borderRadius: 16,
      paddingTop: 8,
      paddingHorizontal: 12,
      paddingBottom: 9,
      gap: 2,
      maxWidth: "100%",
      ...(hasMedia ? { alignSelf: "stretch" } : null),
      ...(highlighted ? { boxShadow: `0 0 0 2px ${theme.colors.cyan100}` } : null),
    },
    name: { ...rubik(13.5), color: theme.colors.ink900 },
    text: { ...assistant(15), lineHeight: lh(15, 1.5), color: theme.colors.ink900 },
    mention: { ...assistant(15, 700), color: theme.colors.primary },
    media: { marginTop: 6, height: COMMENT_MEDIA_HEIGHT, borderRadius: 12, overflow: "hidden" },
    meta: { flexDirection: "row", gap: 14, paddingTop: 4, paddingHorizontal: 12 },
    metaText: { ...assistant(12.5, 600), color: theme.colors.ink400 },
    metaActive: { color: theme.colors.primary },
    metaReply: { color: theme.colors.primary },
  };
}

/** Lab `.more-cmts`. */
export const moreCommentsStyle: { container: ViewStyle; text: TextStyle } = {
  container: { alignSelf: "center", padding: 6 },
  text: { ...assistant(13.5, 700), color: theme.colors.primary },
};
