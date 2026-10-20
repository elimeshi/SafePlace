import type { TextStyle, ViewStyle } from "react-native";
import { feedColors } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab `.ph-filter.soft`: the soft indigo panel shown instead of media the
 * viewer's filter withholds. A 38px translucent disc with an eye icon, a
 * Rubik-600 label and an Assistant hint, centred, 6px apart. Height is 200 on
 * a card and 120 inside a comment (where the hint is dropped).
 */
export const FILTERED_DEFAULT_HEIGHT = 200;

export function resolveFilteredStyle(height: number): {
  container: ViewStyle;
  eye: ViewStyle;
  eyeIconSize: number;
  label: TextStyle;
  hint: TextStyle;
} {
  return {
    container: {
      height,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 30,
      overflow: "hidden",
    },
    eye: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: feedColors.eyeDisc,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
    },
    eyeIconSize: 20,
    label: { ...rubik(14.5), color: theme.colors.ink700, textAlign: "center" },
    hint: { ...assistant(13), lineHeight: lh(13, 1.45), color: theme.colors.ink500, textAlign: "center" },
  };
}
