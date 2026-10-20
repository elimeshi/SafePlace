import type { TextStyle, ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import type { IconName } from "./Icon.glyphs";
import { assistant, lh } from "../foundation/style";

/**
 * Lab `.state-strip`: a full-width band at the foot of a post card — media
 * processing (cyan), under review (amber), or the uploader's post-hoc
 * women-detected notice (blue, stacked with actions).
 */
export type StateStripKind = "processing" | "review" | "notice";

interface Tone {
  bg: string;
  fg: string;
  icon: IconName;
}

const TONES: Record<StateStripKind, Tone> = {
  processing: { bg: theme.colors.cyan100, fg: theme.colors.cyan700, icon: "clock" },
  review: { bg: theme.colors.warningSoft, fg: feedColors.reviewFg, icon: "shield-check" },
  notice: { bg: theme.colors.blue100, fg: theme.colors.ink700, icon: "info" },
};

export function resolveStateStripStyle(kind: StateStripKind): {
  container: ViewStyle;
  text: TextStyle;
  iconColor: string;
  iconName: IconName;
  iconSize: number;
  actions: ViewStyle;
} {
  const t = TONES[kind];
  const stacked = kind === "notice";
  return {
    container: {
      flexDirection: stacked ? "column" : "row",
      alignItems: stacked ? "flex-start" : "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: t.bg,
      // Lab quirk, kept because it is what Eli approved (reference own.png): the notice strip
      // also matches the lab's inline `.notice` card rule, so it is a bordered, shadowed,
      // inset 18px card (14/14/12 padding) rather than a flush band.
      ...(stacked
        ? {
            marginTop: 6,
            marginBottom: 12,
            marginHorizontal: 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.colors.blue200,
            paddingTop: 14,
            paddingBottom: 12,
            boxShadow: shadows.soft,
          }
        : null),
    },
    text: { ...assistant(13.5), lineHeight: lh(13.5, 1.45), color: t.fg, flexShrink: 1 },
    iconColor: t.fg,
    iconName: t.icon,
    iconSize: 18,
    actions: { flexDirection: "row", gap: 8 },
  };
}
