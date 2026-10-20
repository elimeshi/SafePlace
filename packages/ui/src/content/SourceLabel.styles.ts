import type { TextStyle, ViewStyle } from "react-native";
import { feedColors } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, tintOnWhite } from "../foundation/style";

/**
 * Pure styling for SourceLabel (feed lab `.lbl`, 01-feed-spec §4.2): a 22px
 * pill, 12px/600 text, 5px gap to a 13px icon. Colours:
 *   - group / family_space → the space's own colour, tinted 14% over white
 *   - public / followers   → neutral slate (#5B6B85 on #EEF1F6)
 *   - suggested            → warm amber (#A8650A on #FEF3DC)
 */

export type SourceLabelKind = "group" | "family_space" | "public" | "followers" | "suggested";

/** Lab `tint(color, .14)`. */
export const GROUP_TINT_ALPHA = 0.14;

export interface ResolveSourceLabelStyleArgs {
  kind: SourceLabelKind;
  /** Space colour from the palette (kind="group" | "family_space"). */
  color?: string;
}

export interface SourceLabelStyle {
  container: ViewStyle;
  label: TextStyle;
  iconColor: string;
  iconSize: number;
}

export function resolveSourceLabelStyle({
  kind,
  color,
}: ResolveSourceLabelStyleArgs): SourceLabelStyle {
  let fg: string;
  let bg: string;
  if (kind === "group" || kind === "family_space") {
    fg = color ?? theme.colors.primary;
    bg = tintOnWhite(fg, GROUP_TINT_ALPHA);
  } else if (kind === "suggested") {
    fg = feedColors.suggestedLabelFg;
    bg = feedColors.suggestedLabelBg;
  } else {
    fg = feedColors.neutralLabelFg;
    bg = feedColors.neutralLabelBg;
  }

  return {
    container: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 5,
      height: 22,
      paddingHorizontal: 9,
      borderRadius: 999,
      backgroundColor: bg,
    },
    label: { ...assistant(12, 600), color: fg },
    iconColor: fg,
    iconSize: 13,
  };
}
