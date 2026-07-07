/**
 * Motion constants, transcribed directly from the specific animation
 * timings in docs/product/00-master-spec.md §6.3.1–§6.3.4. Unlike colors
 * and fonts, these values are NOT placeholders — the product spec
 * prescribes exact timings and easing, so treat these as close to final.
 *
 * Always gate custom animation on prefers-reduced-motion /
 * AccessibilityInfo.isReduceMotionEnabled() — see §6.3.4 and
 * CLAUDE.md Definition of Done §7.5.
 */

export const motion = {
  /** Standard transition pace for step/element transitions — §6.3.1. */
  durationMs: {
    fast: 200,
    base: 300,
    slow: 400,
  },

  /** Easing: "soft deceleration at the end" per §6.3.1. */
  easing: {
    standard: [0.25, 0.1, 0.25, 1] as const, // ease-out-ish cubic bezier
  },

  /** Staggered element entrance on step load — §6.3.2. */
  staggerDelayMs: {
    min: 80,
    max: 120,
  },

  /** translateY offset for the fade-and-rise entrance animation — §6.3.2. */
  entranceTranslateY: 8,

  /** Primary CTA button idle "breathing" halo — §6.3.2, 3–4s cycle. */
  ctaHaloDurationMs: 3500,

  /** Press feedback scale for primary CTAs — §6.3.2. */
  pressScale: 0.97,
} as const;

/**
 * RTL note: step-transition slide direction must be mirrored for Hebrew —
 * outgoing step exits toward the left, incoming step enters from the
 * right (§6.3.2). Do not reuse LTR-authored animation direction constants
 * from any UI library without verifying this explicitly.
 */
export const RTL_STEP_TRANSITION_DIRECTION = {
  exit: "left",
  enter: "right",
} as const;
