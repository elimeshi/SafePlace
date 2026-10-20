import type { TextStyle, ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh } from "../foundation/style";

/**
 * Lab `.stories` / `.story` / `.plus-grad` / `.stories-empty`. Until statuses
 * ship the rail shows only the gradient "+" and a quiet hint (plan §2).
 *
 * Quirk preserved on purpose: the lab's `.lbl` rule (22px pill) also matches
 * the "+" caption, so the caption keeps its 22px height, 9px side padding and
 * `align-self: flex-start` — it sits at the start edge of the 66px column.
 */
export const PLUS_SIZE = 62;

export function resolveStatusesRailStyle(): {
  row: ViewStyle;
  story: ViewStyle;
  plus: ViewStyle;
  plusIconSize: number;
  caption: ViewStyle;
  captionText: TextStyle;
  empty: ViewStyle;
  emptyText: TextStyle;
} {
  return {
    row: { flexDirection: "row", gap: 14, paddingTop: 6, paddingHorizontal: 18, paddingBottom: 12, overflow: "hidden" },
    story: { width: 66, flexGrow: 0, flexShrink: 0, alignItems: "center", gap: 6 },
    plus: {
      width: PLUS_SIZE,
      height: PLUS_SIZE,
      borderRadius: PLUS_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: shadows.cta,
    },
    plusIconSize: 26,
    caption: { height: 22, paddingHorizontal: 9, justifyContent: "center", alignSelf: "flex-start" },
    captionText: { ...assistant(12, 600), color: theme.colors.ink500 },
    empty: { flex: 1, maxWidth: 220, justifyContent: "center", paddingTop: 14 },
    emptyText: { ...assistant(13), lineHeight: lh(13, 1.4), color: theme.colors.ink400 },
  };
}
