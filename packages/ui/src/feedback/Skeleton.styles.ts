import type { ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import type { CssGradient } from "@safeplace/design-tokens";
import { theme } from "../theme";

/**
 * Lab `.sk`: a 90deg shimmer of #E6E9F5 → #EFF1F9 (40%) → #E6E9F5 (80%) on a
 * 200%-wide ground sliding for 1.4s, linear, forever; radius 8. Static under
 * reduced motion.
 */
export const SHIMMER_MS = 1400;

export const SHIMMER_GRADIENT: CssGradient = {
  angle: 90,
  stops: [
    [feedColors.skeletonA, 0],
    [feedColors.skeletonB, 0.4],
    [feedColors.skeletonA, 0.8],
  ],
};

/**
 * The ground (2× the box) slides from -W to +W: lab `background-position`
 * 100% → -100% of a 200% image offsets it by -W → +W.
 */
export function shimmerTranslate(width: number): { from: number; to: number } {
  return { from: -width, to: width };
}

/** Lab `.skc`: the skeleton post card shell. */
export const skeletonCardStyle: ViewStyle = {
  backgroundColor: theme.colors.surface,
  borderRadius: 24,
  boxShadow: shadows.soft,
  paddingVertical: 15,
  paddingHorizontal: 16,
  gap: 10,
};
