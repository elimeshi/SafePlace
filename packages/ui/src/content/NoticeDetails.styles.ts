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

/** The toggle reuses the secondary MiniButton's label (indigo Rubik 13): no new visual language. */
export function resolveNoticeDetailsStyle(): { toggle: ViewStyle; label: TextStyle; chevronSize: number; chevronColor: string } {
  const label = resolveMiniButtonStyle("secondary").label;
  return {
    toggle: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 2, paddingVertical: 2 },
    label,
    chevronSize: 16,
    chevronColor: String(label.color),
  };
}
