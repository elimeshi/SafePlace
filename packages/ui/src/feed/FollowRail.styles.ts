import type { TextStyle, ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab `.frail` / `.fcard` / `.fbtn` (01-feed-spec §6.4): the dismissible
 * follow-suggestions sheet pinned to the bottom near the end of the feed.
 * Counts are numbers only — never a list (invariant #5).
 */
export const FOLLOW_CARD_WIDTH = 132;
export const FOLLOW_BIO_HEIGHT = 32;

export function resolveFollowRailStyle(): {
  rail: ViewStyle;
  top: ViewStyle;
  title: TextStyle;
  closeColor: string;
  row: ViewStyle;
  card: ViewStyle;
  name: TextStyle;
  bio: TextStyle;
  count: TextStyle;
  button: ViewStyle;
  buttonText: TextStyle;
} {
  return {
    rail: {
      backgroundColor: feedColors.frostRail,
      borderTopStartRadius: 24,
      borderTopEndRadius: 24,
      paddingTop: 12,
      paddingBottom: 14,
      boxShadow: shadows.rail,
    },
    top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 10 },
    title: { ...rubik(15), color: theme.colors.ink900 },
    closeColor: theme.colors.ink400,
    row: { flexDirection: "row", gap: 10, paddingHorizontal: 18 },
    card: {
      width: FOLLOW_CARD_WIDTH,
      flexGrow: 0,
      flexShrink: 0,
      borderRadius: 18,
      backgroundColor: theme.colors.background,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: "center",
      gap: 6,
    },
    name: { ...rubik(13.5), maxWidth: "100%", textAlign: "center", color: theme.colors.ink900 },
    bio: {
      ...assistant(12),
      lineHeight: lh(12, 1.35),
      color: theme.colors.ink500,
      height: FOLLOW_BIO_HEIGHT,
      overflow: "hidden",
      textAlign: "center",
    },
    count: { ...assistant(12), color: theme.colors.ink400, textAlign: "center" },
    button: {
      alignSelf: "stretch",
      alignItems: "center",
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      paddingVertical: 7,
      marginTop: 2,
    },
    buttonText: { ...rubik(13), color: "#FFFFFF" },
  };
}
