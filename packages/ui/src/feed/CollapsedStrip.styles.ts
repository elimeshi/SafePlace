import type { TextStyle, ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant } from "../foundation/style";

/**
 * Lab `.cstrip` (01-feed-spec §6.2): a thin frosted pill — overlapping avatars
 * at the start, "tap to expand" centred, a chevron at the end. The lab's
 * backdrop blur is not reproduced (RN has no backdrop-filter); the 86% white
 * fill reads the same over the flat feed ground.
 */
export const STRIP_AVATAR_SIZE = 26;

export function resolveCollapsedStripStyle(): {
  strip: ViewStyle;
  avatars: ViewStyle;
  avatarOverlap: ViewStyle;
  avatarRing: ViewStyle;
  label: TextStyle;
  chevronSize: number;
  chevronColor: string;
} {
  return {
    strip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 2,
      marginHorizontal: 14,
      marginBottom: 10,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: feedColors.frostStrip,
      boxShadow: shadows.soft,
    },
    avatars: { flexDirection: "row" },
    avatarOverlap: { marginStart: -8 },
    avatarRing: { borderRadius: 999, boxShadow: `0 0 0 2px ${theme.colors.surface}` },
    label: { ...assistant(13, 600), flex: 1, textAlign: "center", color: theme.colors.ink500 },
    chevronSize: 18,
    chevronColor: theme.colors.ink500,
  };
}
