/**
 * Phase 4 feed/compose/post tokens, transcribed one-to-one from the locked
 * design lab (docs/design/phase-4-feed/feed-lab.html). Shadows are CSS
 * `box-shadow` strings: React Native 0.76+ (new architecture) and
 * react-native-web both accept them via the `boxShadow` style prop, which is
 * the only way to reproduce the lab's two-layer / negative-spread shadows.
 */

export const feedColors = {
  /** Source label tints that are fixed in the lab (group labels are derived). */
  neutralLabelBg: "#EEF1F6",
  neutralLabelFg: "#5B6B85",
  suggestedLabelBg: "#FEF3DC",
  suggestedLabelFg: "#A8650A",
  /** state-strip.review text. */
  reviewFg: "#8A5A12",
  /** Highlighted comment (reply mode). */
  replyHighlightBg: "#EEF8FA",
  /** Skeleton shimmer stops. */
  skeletonA: "#E6E9F5",
  skeletonB: "#EFF1F9",
  /** Media stand-in behind a loading image. */
  mediaGround: "#CFD6EA",
  /** Bottom-sheet scrim. */
  scrim: "rgba(16,26,58,.38)",
  /** Frosted surfaces (collapsed strip / follow rail). */
  frostStrip: "rgba(255,255,255,.86)",
  frostRail: "rgba(255,255,255,.96)",
  /** Overlays on media (remove button / classification chip) and the eye disc. */
  mediaOverlay: "rgba(16,26,58,.55)",
  mediaChip: "rgba(255,255,255,.92)",
  eyeDisc: "rgba(255,255,255,.75)",
} as const;

export const shadows = {
  soft: "0 2px 10px rgba(20,26,60,.07), 0 1px 3px rgba(20,26,60,.06)",
  cta: "0 12px 26px -10px rgba(46,58,140,.6)",
  sheet: "0 -10px 40px -10px rgba(16,26,58,.35)",
  rail: "0 -6px 24px -12px rgba(20,26,60,.25)",
  panel: "0 14px 30px -14px rgba(16,26,58,.35)",
  knob: "0 1px 3px rgba(0,0,0,.3)",
  focusRing: "0 0 0 3px rgba(46,58,140,.14)",
} as const;

export interface CssGradient {
  /** CSS angle in degrees (180 = top to bottom). */
  angle: number;
  stops: ReadonlyArray<readonly [color: string, offset: number]>;
}

/** CSS-angle gradients, resolved against the real box by the UI's GradientFill. */
export const feedGradients = {
  /** "+" in the statuses rail. */
  createFill: {
    angle: 145,
    stops: [
      ["#22C3D6", 0],
      ["#2E3A8C", 0.6],
      ["#1B2352", 1],
    ],
  },
  /** Family Space card header. */
  familySpace: {
    angle: 145,
    stops: [
      ["#22C3D6", 0],
      ["#2E3A8C", 0.7],
    ],
  },
  /** Filtered-media placeholder. */
  filteredPanel: {
    angle: 180,
    stops: [
      ["#EEF1FA", 0],
      ["#E5E8F7", 1],
    ],
  },
} as const satisfies Record<string, CssGradient>;
