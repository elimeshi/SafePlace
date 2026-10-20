import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import { assistant } from "../foundation/style";

/** Lab `.bnav` / `.tab`: Home / Search / Profile; the active tab is primary with a 2.4 stroke. */
export type TabKey = "home" | "search" | "profile";

export const TAB_ICONS = { home: "home", search: "search", profile: "user" } as const;

export function resolveBottomTabsStyle(): {
  bar: ViewStyle;
  tab: ViewStyle;
  label: TextStyle;
} {
  return {
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingTop: 8,
      paddingHorizontal: 24,
      paddingBottom: 22,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.ink100,
    },
    tab: { width: 70, alignItems: "center", gap: 3 },
    label: assistant(11, 600),
  };
}

export function tabVisual(active: boolean): { color: string; strokeWidth: number } {
  return active
    ? { color: theme.colors.primary, strokeWidth: 2.4 }
    : { color: theme.colors.ink400, strokeWidth: 2 };
}
