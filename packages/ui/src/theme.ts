import {
  colors,
  elevation,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  motion,
  radius,
  spacing,
  tracking,
  typeRole,
} from "@safeplace/design-tokens";

/**
 * The single seam between design tokens and React Native component code.
 * Components in this package (and screens in apps/mobile, which re-exports
 * this) import `theme` from here rather than reaching into
 * @safeplace/design-tokens directly — so if the token shape ever needs an
 * RN-specific adapter (e.g. the *loaded* font-family name from expo-font
 * differs from the token name until loading finishes), there is one place to
 * change.
 */
export const theme = {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  tracking,
  typeRole,
  spacing,
  radius,
  motion,
  elevation,
} as const;

export type Theme = typeof theme;
