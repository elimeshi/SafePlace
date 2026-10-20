import type { TextStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure style helpers shared by the Phase 4 pieces. Every number a piece uses
 * comes from docs/design/phase-4-feed/feed-lab.html; these only remove
 * repetition. Hebrew copy never lives here (ADR 0007).
 */

const ASSISTANT = {
  400: theme.fontFamily.base,
  500: theme.fontFamily.medium,
  600: theme.fontFamily.semibold,
  700: theme.fontFamily.bold,
} as const;

/** Assistant (body) text: the family carries the weight, never `fontWeight`. */
export function assistant(size: number, weight: keyof typeof ASSISTANT = 400, extra: TextStyle = {}): TextStyle {
  return { fontFamily: ASSISTANT[weight], fontSize: size, ...extra };
}

/** Rubik (display) text, weight 600 (default) or 700. */
export function rubik(size: number, weight: 600 | 700 = 600, extra: TextStyle = {}): TextStyle {
  return {
    fontFamily: weight === 700 ? theme.fontFamily.display : theme.fontFamily.displaySemibold,
    fontSize: size,
    ...extra,
  };
}

/** CSS `line-height: <ratio>` as RN pixels. */
export const lh = (size: number, ratio: number): number => Math.round(size * ratio * 100) / 100;

/**
 * The lab's `tint(hex, a)`: a 6-digit hex mixed over white, as an opaque
 * rgb() so it matches the lab pixel for pixel.
 */
export function tintOnWhite(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
