import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import { assistant, lh } from "../foundation/style";

/**
 * Lab `.expo` / `.expo.locked` / `.expo-help`: the audience chip under the
 * author's name in compose — 30px pill, 13px/700 text, 6px gap. Locked (group /
 * Family Space entry): neutral fill with a hairline and a lock, no chevron.
 */
export function resolveExposureChipStyle(locked: boolean): {
  chip: ViewStyle;
  text: TextStyle;
  color: string;
  iconSize: number;
  help: TextStyle;
} {
  const color = locked ? theme.colors.ink700 : theme.colors.primary;
  return {
    chip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      height: 30,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: locked ? theme.colors.background : theme.colors.blue100,
      ...(locked ? { borderWidth: 1, borderColor: theme.colors.border } : null),
    },
    text: { ...assistant(13, 700), color },
    color,
    iconSize: 15,
    help: { ...assistant(12), lineHeight: lh(12, 1.4), color: theme.colors.ink400, maxWidth: 260 },
  };
}
