import { colors, fontFamily, fontSize, fontWeight, motion, radius, spacing } from "@safeplace/design-tokens";

/**
 * Single import surface for design tokens inside React Native components.
 * Screens should import `theme` from here rather than importing
 * @safeplace/design-tokens directly in many places — keeps a single seam
 * if the token shape ever needs an RN-specific adapter (e.g. font loading
 * requires the *loaded* font family name, which may differ from the token
 * name until expo-font finishes loading).
 */
export const theme = {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  motion,
  radius,
  spacing,
} as const;
