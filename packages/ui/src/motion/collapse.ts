import { motion } from "@safeplace/design-tokens";

/**
 * Timings of the feed's collapse-on-scroll (feed-lab `expanded` caption and
 * the `.mzones` / `.mstrip` CSS): zones height→0 over 260ms and fade over
 * 220ms; the strip fades in from −8px over 200ms; ease (0.25,0.1,0.25,1).
 * Reduced motion: opacity only — no height tween, no slide.
 */
export interface CollapseTimings {
  heightMs: number;
  zonesFadeMs: number;
  stripMs: number;
  stripOffsetY: number;
  /** Tween the height (false = jump). */
  animateHeight: boolean;
}

export function collapseTimings(reducedMotion: boolean): CollapseTimings {
  return reducedMotion
    ? { heightMs: 0, zonesFadeMs: 200, stripMs: 200, stripOffsetY: 0, animateHeight: false }
    : { heightMs: 260, zonesFadeMs: 220, stripMs: 200, stripOffsetY: -8, animateHeight: true };
}

export const COLLAPSE_EASING = motion.easing.standard;
