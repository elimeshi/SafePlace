/**
 * Safe-Place typography tokens — "Indigo Nights" (design-lab/FINAL-SPEC.md).
 * Rubik = display / headings / buttons; Assistant = body, fields, meta.
 * Both cover Hebrew. Near-zero letter-spacing (Hebrew wants it tight),
 * comfortable body line-height.
 *
 * Family names match the loaded @expo-google-fonts identifiers, wired via
 * expo-font/useFonts in apps/mobile/app/_layout.tsx — until loading finishes
 * RN falls back to the system font.
 */

export const fontFamily = {
  base: "Assistant_400Regular",
  medium: "Assistant_500Medium",
  semibold: "Assistant_600SemiBold",
  bold: "Assistant_700Bold",
  display: "Rubik_700Bold",
  displaySemibold: "Rubik_600SemiBold",
  numeric: "Assistant_400Regular",
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
 * Display roles ride Rubik; reading roles ride Assistant.
 */
export const typeRole = {
  display: { fontFamily: "Rubik_700Bold", fontSize: 38, lineHeight: 44 },
  wordmark: { fontFamily: "Rubik_700Bold", fontSize: 37, lineHeight: 44 },
  h1: { fontFamily: "Rubik_700Bold", fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: "Rubik_700Bold", fontSize: 26, lineHeight: 32 },
  h3: { fontFamily: "Rubik_600SemiBold", fontSize: 20, lineHeight: 26 },
  body: { fontFamily: "Assistant_400Regular", fontSize: 16, lineHeight: 26 },
  bodyStrong: { fontFamily: "Assistant_600SemiBold", fontSize: 16, lineHeight: 26 },
  meta: { fontFamily: "Assistant_400Regular", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: "Assistant_600SemiBold", fontSize: 12, lineHeight: 16 },
} as const;
