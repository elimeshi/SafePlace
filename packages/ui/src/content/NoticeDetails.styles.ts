import type { TextStyle, ViewStyle } from "react-native";
import { motion } from "@safeplace/design-tokens";
import type { Direction } from "../foundation/arrows";
import type { IconName } from "./Icon.glyphs";
import { resolveMiniButtonStyle } from "./MiniButton.styles";

/**
 * The notice's "what was found?" disclosure. Collapsed, the chevron points
 * forward along the reading direction (left in Hebrew), so it mirrors; open,
 * it points down in both directions.
 */
export function detailsChevronName(expanded: boolean, direction: Direction): IconName {
  if (expanded) return "chevron-down";
  return direction === "rtl" ? "chevron-left" : "chevron-right";
}

/** Reduced motion: the body's height jumps instead of tweening. */
export function detailsMotion(reducedMotion: boolean): { animateHeight: boolean; ms: number } {
  return reducedMotion ? { animateHeight: false, ms: 0 } : { animateHeight: true, ms: motion.durationMs.fast };
}

/** Minimum touch target (Apple HIG 44pt); reached with hitSlop so the line's visual size is unchanged. */
export const MIN_TOUCH = 44;

/** The toggle reuses the secondary MiniButton's label (indigo Rubik 13): no new visual language. */
export function resolveNoticeDetailsStyle(): {
  toggle: ViewStyle;
  label: TextStyle;
  chevronSize: number;
  chevronColor: string;
  hitSlop: { top: number; bottom: number; left: number; right: number };
} {
  const label = resolveMiniButtonStyle("secondary").label;
  const chevronSize = 16;
  const paddingVertical = 2;
  // The row is at least the chevron plus padding tall; the slop makes up the rest of 44.
  const v = Math.ceil((MIN_TOUCH - chevronSize - 2 * paddingVertical) / 2);
  return {
    toggle: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 2, paddingVertical },
    label,
    chevronSize,
    chevronColor: String(label.color),
    hitSlop: { top: v, bottom: v, left: 8, right: 8 },
  };
}
