/**
 * Onboarding gradient tokens — precomputed stops for expo-linear-gradient
 * (design-lab/FINAL-SPEC.md). React Native has no CSS gradients or color-mix,
 * so the lab's live-mixed stops are baked to hex here. `start`/`end` are the
 * gradient vector in LinearGradient's 0..1 space; the values approximate the
 * lab's CSS angles. Gradients are absolute — RTL does not mirror them.
 */

export interface GradientToken {
  colors: readonly string[];
  locations: readonly number[];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export const gradients = {
  /**
   * Welcome "Dual" (≈172°): cyan wash at top, cobalt wash at bottom, near-white
   * band through the middle. Top = accent #22C3D6 @25% into #F3F5FC; bottom =
   * cobalt #0C3A78 @25% into #F3F5FC.
   */
  welcomeDual: {
    colors: ["#BFE9F3", "#F3F5FC", "#F3F5FC", "#B9C6DB"],
    locations: [0, 0.43, 0.57, 1],
    start: { x: 0.06, y: 0 },
    end: { x: -0.06, y: 1 },
  },

  /**
   * Full-bleed "balanced": the lab is `linear-gradient(145deg, #22C3D6 0%,
   * #2E3A8C 52%, #1B2352 100%)` — cyan top-left down to deep indigo
   * bottom-right. expo-linear-gradient stretches the start→end vector to the
   * box, so a plain corner-to-corner {0,0}→{1,1} renders ~155° (too vertical)
   * on a tall phone. These endpoints reproduce 145° for a portrait aspect
   * (≈0.46 w/h): Δ=(1, 0.64) scaled by the box lands on the lab's direction.
   */
  fullBleed: {
    colors: ["#22C3D6", "#2E3A8C", "#1B2352"],
    locations: [0, 0.52, 1],
    start: { x: 0, y: 0.18 },
    end: { x: 1, y: 0.82 },
  },
} as const satisfies Record<string, GradientToken>;
