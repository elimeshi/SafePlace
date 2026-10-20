import type { TextStyle, ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab compose chrome: `.ctop` / `.pub` / `.cid` / `.ctext` / `.cmedia` /
 * `.cloc` / `.abar` / `.abtn`, and the single-post `.ptop`. Compose is a white
 * sheet (locked choice).
 */
export function resolveComposeStyle(): {
  top: ViewStyle;
  title: TextStyle;
  iconButton: ViewStyle;
  publish: ViewStyle;
  publishLive: ViewStyle;
  publishDim: ViewStyle;
  publishText: TextStyle;
  identity: ViewStyle;
  identityColumn: ViewStyle;
  identityName: TextStyle;
  text: TextStyle;
  mediaBox: ViewStyle;
  mediaRemove: ViewStyle;
  mediaChip: ViewStyle;
  mediaChipText: TextStyle;
  locationChip: ViewStyle;
  locationText: TextStyle;
  actionBar: ViewStyle;
  actionButton: ViewStyle;
  actionText: TextStyle;
} {
  return {
    top: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 4,
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.ink100,
    },
    title: { ...rubik(16.5), color: theme.colors.ink900 },
    iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    publish: { borderRadius: 14, backgroundColor: theme.colors.primary, paddingVertical: 9, paddingHorizontal: 18 },
    publishLive: { boxShadow: shadows.cta },
    publishDim: { opacity: 0.4 },
    publishText: { ...rubik(15), color: "#FFFFFF" },
    identity: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 6 },
    identityColumn: { flexDirection: "column", gap: 6 },
    identityName: { ...rubik(15.5), color: theme.colors.ink900 },
    text: {
      ...assistant(17),
      lineHeight: lh(17, 1.65),
      color: theme.colors.ink900,
      paddingVertical: 10,
      paddingHorizontal: 18,
      minHeight: 120,
      textAlignVertical: "top",
    },
    mediaBox: { marginTop: 4, marginHorizontal: 18, marginBottom: 12, borderRadius: 18, overflow: "hidden", height: 190 },
    mediaRemove: {
      position: "absolute",
      top: 10,
      end: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: feedColors.mediaOverlay,
      alignItems: "center",
      justifyContent: "center",
    },
    mediaChip: {
      position: "absolute",
      bottom: 10,
      start: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 11,
      borderRadius: 999,
      backgroundColor: feedColors.mediaChip,
    },
    mediaChipText: { ...assistant(12.5, 700), color: theme.colors.cyan700 },
    locationChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginHorizontal: 18,
      marginBottom: 10,
      height: 30,
      paddingStart: 10,
      paddingEnd: 12,
      borderRadius: 999,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    locationText: { ...assistant(13, 600), color: theme.colors.ink700 },
    actionBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingTop: 10,
      paddingHorizontal: 14,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.ink100,
      backgroundColor: theme.colors.surface,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
    },
    actionText: { ...assistant(14, 600), color: theme.colors.ink700 },
  };
}

/** Lab `.ptop`: the single-post top bar. */
export function resolvePostTopBarStyle(): { bar: ViewStyle; title: TextStyle } {
  return {
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 2,
      paddingHorizontal: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.ink100,
      backgroundColor: theme.colors.surface,
    },
    title: { ...rubik(16.5), color: theme.colors.ink900 },
  };
}
