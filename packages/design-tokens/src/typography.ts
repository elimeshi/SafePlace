/**
 * Safe-Place typography tokens — finalized from the locked design system
 * (design-reference/tokens/typography.css). Rubik = primary UI + display;
 * Heebo = companion for numerals/dense text. Near-zero letter-spacing
 * (Hebrew wants it tight), comfortable body line-height.
 *
 * Font files are loaded via expo-font in apps/mobile (wired in Phase 2 —
 * the onboarding screen is where they first render on a device).
 */

export const fontFamily = {
  base: "Rubik",
  medium: "Rubik-Medium",
  semibold: "Rubik-SemiBold",
  bold: "Rubik-Bold",
  numeric: "Heebo",
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 38, // onboarding welcome headline
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeight = {
  tight: 1.25,
  base: 1.5,
  relaxed: 1.75,
} as const;

/** Letter-spacing in px (em × 16). Hebrew wants near-zero tracking. */
export const tracking = {
  tight: -0.16,
  normal: 0,
  label: 0.16,
} as const;

/**
 * Semantic type roles as React Native TextStyle fragments (fontSize and
 * lineHeight in px). Compose with a color at the call site; RTL text
 * direction is handled by the app's global RTL bootstrap, not here.
 */
export const typeRole = {
  display: { fontFamily: "Rubik-Bold", fontSize: 38, lineHeight: 44 },
  h1: { fontFamily: "Rubik-Bold", fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: "Rubik-SemiBold", fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: "Rubik-SemiBold", fontSize: 20, lineHeight: 26 },
  body: { fontFamily: "Rubik", fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: "Rubik-Medium", fontSize: 16, lineHeight: 26 },
  meta: { fontFamily: "Rubik", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: "Rubik-Medium", fontSize: 12, lineHeight: 16 },
} as const;
