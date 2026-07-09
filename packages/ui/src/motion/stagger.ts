import { motion } from "@safeplace/design-tokens";

/** Midpoint of the 80–120ms stagger band from the design system (§6.3.2). */
const DEFAULT_STEP_MS = (motion.staggerDelayMs.min + motion.staggerDelayMs.max) / 2;

/**
 * Entrance delay (ms) for the element at `index` in a staggered fade-and-rise.
 * Pure and unit-tested; the reanimated `useRiseIn` hook consumes it. Returns 0
 * for every index under reduced motion.
 */
export function staggerDelayForIndex(
  index: number,
  opts: { reducedMotion?: boolean; stepMs?: number } = {}
): number {
  if (opts.reducedMotion) return 0;
  return Math.max(0, index) * (opts.stepMs ?? DEFAULT_STEP_MS);
}
