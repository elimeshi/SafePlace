import type { TextStyle, ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab `.space`: a 156px rail card — header (solid group colour, or the brand
 * gradient for a Family Space), an 80px body (latest-post media, or its text on
 * the app ground) and a one-line footer "author · time".
 */
export const SPACE_CARD_WIDTH = 156;
export const SPACE_BODY_HEIGHT = 80;

export function resolveSpaceCardStyle(): {
  card: ViewStyle;
  header: ViewStyle;
  headerIconSize: number;
  headerText: TextStyle;
  body: ViewStyle;
  bodyText: ViewStyle;
  bodyTextStyle: TextStyle;
  footer: TextStyle;
} {
  return {
    card: {
      width: SPACE_CARD_WIDTH,
      flexGrow: 0,
      flexShrink: 0,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
      boxShadow: shadows.soft,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 9, paddingHorizontal: 11, overflow: "hidden" },
    headerIconSize: 15,
    headerText: { ...rubik(12.5, 700), flexShrink: 1 },
    body: { height: SPACE_BODY_HEIGHT, overflow: "hidden" },
    bodyText: { paddingVertical: 9, paddingHorizontal: 11, backgroundColor: theme.colors.background },
    bodyTextStyle: { ...assistant(13), lineHeight: lh(13, 1.45), color: theme.colors.ink700 },
    footer: { ...assistant(11.5), paddingVertical: 8, paddingHorizontal: 11, color: theme.colors.ink400 },
  };
}
