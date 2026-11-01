import type { TextStyle, ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh } from "../foundation/style";

/** Lab `.notice` — the inline, before-publish content notice (compose). */
export function resolveUploaderNoticeStyle(): {
  container: ViewStyle;
  iconSize: number;
  iconColor: string;
  iconWrap: ViewStyle;
  column: ViewStyle;
  text: TextStyle;
  details: ViewStyle;
  actions: ViewStyle;
} {
  return {
    container: {
      marginTop: 6,
      marginBottom: 12,
      marginHorizontal: 18,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.blue200,
      paddingTop: 14,
      paddingHorizontal: 14,
      paddingBottom: 12,
      flexDirection: "row",
      gap: 10,
      boxShadow: shadows.soft,
    },
    iconSize: 22,
    iconColor: theme.colors.primary,
    iconWrap: { marginTop: 1 },
    column: { flex: 1 },
    text: { ...assistant(14.5), lineHeight: lh(14.5, 1.55), color: theme.colors.ink900, marginBottom: 10 },
    details: { marginBottom: 10 },
    actions: { flexDirection: "row", gap: 8, alignItems: "center" },
  };
}
