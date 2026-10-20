import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import { rubik } from "../foundation/style";

/** Lab `.mini`: radius 12, padding 7/12, Rubik 600 13. */
export type MiniButtonVariant = "primary" | "secondary" | "ghost";

export function resolveMiniButtonStyle(variant: MiniButtonVariant): { container: ViewStyle; label: TextStyle } {
  const base: ViewStyle = {
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  };
  if (variant === "primary") {
    return { container: { ...base, backgroundColor: theme.colors.primary }, label: { ...rubik(13), color: "#FFFFFF" } };
  }
  if (variant === "secondary") {
    return {
      container: { ...base, borderWidth: 1.5, borderColor: theme.colors.blue300 },
      label: { ...rubik(13), color: theme.colors.primary },
    };
  }
  return {
    container: { ...base, paddingHorizontal: 6 },
    label: { ...rubik(13), color: theme.colors.ink500 },
  };
}
