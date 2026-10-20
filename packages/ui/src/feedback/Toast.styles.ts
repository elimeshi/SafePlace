import type { TextStyle, ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant } from "../foundation/style";

/** Lab `.toast`: 18px gutters, 96px above the bottom, primaryDark, radius 14, 11/14 padding. */
export function resolveToastStyle(bottom: number): { container: ViewStyle; text: TextStyle; iconSize: number } {
  return {
    container: {
      position: "absolute",
      start: 18,
      end: 18,
      bottom,
      zIndex: 12,
      backgroundColor: theme.colors.primaryDark,
      borderRadius: 14,
      paddingVertical: 11,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      boxShadow: shadows.cta,
    },
    text: { ...assistant(14), color: "#FFFFFF", flexShrink: 1 },
    iconSize: 18,
  };
}
