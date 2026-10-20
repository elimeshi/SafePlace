import type { TextStyle, ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab `.scrim` / `.sheet` / `.srow` / `.sdiv` / `.sgroup` / `.ck` / `.radio` /
 * `.gico` / `.back-row` — the bottom-sheet vocabulary shared by every menu.
 */

export function resolveSheetStyle(): {
  scrim: ViewStyle;
  sheet: ViewStyle;
  grab: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  backRow: ViewStyle;
  backTitle: TextStyle;
  backButton: ViewStyle;
  backIconSize: number;
  divider: ViewStyle;
  group: TextStyle;
} {
  return {
    scrim: { position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: feedColors.scrim, zIndex: 10 },
    sheet: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
      zIndex: 11,
      backgroundColor: theme.colors.surface,
      borderTopStartRadius: 24,
      borderTopEndRadius: 24,
      paddingTop: 8,
      paddingBottom: 26,
      boxShadow: shadows.sheet,
    },
    grab: { width: 40, height: 5, borderRadius: 9, backgroundColor: theme.colors.border, marginTop: 2, marginBottom: 10, alignSelf: "center" },
    title: { ...rubik(16), color: theme.colors.ink900, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 10 },
    subtitle: { ...assistant(13.5), lineHeight: lh(13.5, 1.5), color: theme.colors.ink500, paddingHorizontal: 20, paddingBottom: 10 },
    backRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2, paddingHorizontal: 12, paddingBottom: 8 },
    backTitle: { ...rubik(16), color: theme.colors.ink900 },
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    backIconSize: 20,
    divider: { height: 1, backgroundColor: theme.colors.ink100, marginVertical: 6, marginHorizontal: 20 },
    group: { ...assistant(11.5, 700), color: theme.colors.ink400, letterSpacing: 0.46, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 4 },
  };
}

export interface SheetRowStyleArgs {
  disabled?: boolean;
  selected?: boolean;
  /** Report rows: 10px vertical padding instead of 13. */
  dense?: boolean;
}

export function resolveSheetRowStyle({ disabled, selected, dense }: SheetRowStyleArgs): {
  row: ViewStyle;
  text: ViewStyle;
  label: TextStyle;
  hint: TextStyle;
  iconColor: string;
  iconSize: number;
  trailingColor: string;
  tile: ViewStyle;
  tileIconSize: number;
} {
  return {
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingVertical: dense ? 10 : 13,
      paddingHorizontal: 20,
      opacity: disabled ? 0.45 : 1,
      backgroundColor: selected ? theme.colors.background : "transparent",
    },
    text: { flex: 1, flexDirection: "column", gap: 2 },
    label: { ...assistant(15.5), color: theme.colors.ink900 },
    hint: { ...assistant(12.5), color: theme.colors.ink400 },
    iconColor: theme.colors.primary,
    iconSize: 22,
    trailingColor: theme.colors.ink400,
    tile: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    tileIconSize: 18,
  };
}

/** Lab `.ck` (22px, radius 7, 1.5 border) and `.radio` (22px circle, 2 border, 11px dot). */
export function resolveSheetControlStyle(type: "checkbox" | "radio", checked: boolean): { box: ViewStyle; dot?: ViewStyle } {
  if (type === "checkbox") {
    return {
      box: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: checked ? theme.colors.primary : theme.colors.border,
        backgroundColor: checked ? theme.colors.primary : "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
      },
    };
  }
  return {
    box: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: checked ? theme.colors.primary : theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: theme.colors.primary },
  };
}
