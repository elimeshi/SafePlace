import type { TextStyle, ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { rubik } from "../foundation/style";

/** Lab `.cta` / `.cta.secondary`: radius 18, Rubik 600 16, padding 14/26. */
export type ActionButtonVariant = "primary" | "secondary";

export function resolveActionButtonStyle(variant: ActionButtonVariant): { container: ViewStyle; label: TextStyle } {
  const base: ViewStyle = {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 26,
    alignItems: "center",
    justifyContent: "center",
  };
  if (variant === "secondary") {
    return {
      container: { ...base, borderWidth: 1.5, borderColor: theme.colors.blue300, backgroundColor: "transparent" },
      label: { ...rubik(16), color: theme.colors.primary },
    };
  }
  return {
    container: { ...base, backgroundColor: theme.colors.primary, boxShadow: shadows.cta },
    label: { ...rubik(16), color: "#FFFFFF" },
  };
}
