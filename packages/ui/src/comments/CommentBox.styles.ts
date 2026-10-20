import type { TextStyle, ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant } from "../foundation/style";

/**
 * Lab `.cbox` / `.field` / `.field.active` / `.send` / `.replybar` / `.atchip`:
 * the sticky comment box. Reply mode adds the "replying to" bar above and an @
 * chip inside the field, which takes the focus ring.
 */
export function resolveCommentBoxStyle(active: boolean): {
  box: ViewStyle;
  field: ViewStyle;
  input: TextStyle;
  chip: ViewStyle;
  chipText: TextStyle;
  iconButton: ViewStyle;
  send: ViewStyle;
  replyBar: ViewStyle;
  replyText: TextStyle;
  replyName: TextStyle;
  placeholder: string;
} {
  return {
    box: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingTop: 10,
      paddingHorizontal: 12,
      paddingBottom: 26,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.ink100,
    },
    field: {
      flex: 1,
      height: 42,
      borderRadius: 999,
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: active ? theme.colors.primary : theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: active ? 6 : 0,
      ...(active ? { boxShadow: shadows.focusRing } : null),
    },
    input: { ...assistant(15), flex: 1, padding: 0, color: theme.colors.ink900 },
    chip: { height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: theme.colors.blue100, justifyContent: "center" },
    chipText: { ...assistant(13, 700), color: theme.colors.primary },
    iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    send: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
    replyBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.ink100,
    },
    replyText: { ...assistant(13), color: theme.colors.ink500 },
    replyName: { ...assistant(13, 700), color: theme.colors.ink700 },
    placeholder: theme.colors.ink400,
  };
}
