/**
 * ⚠️ PLACEHOLDER VALUES — pending Claude Design session and a real Hebrew
 * font pairing decision. See docs/product/00-master-spec.md §6.3.5:
 * "modern, high-quality Hebrew typography — font choice is especially
 * critical for this audience."
 *
 * Do not ship these font family names to production without confirming
 * license terms and actually bundling the fonts in apps/mobile.
 */

export const fontFamily = {
  // Placeholder — a well-hinted, warm Hebrew-support sans-serif.
  // Candidates to evaluate in the design session: Assistant, Rubik, Heebo.
  base: "Rubik",
  bold: "Rubik-Bold",
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
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
