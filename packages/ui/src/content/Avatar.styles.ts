import type { ImageStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for Avatar — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/content/Avatar.jsx. The web reference draws
 * the status ring as a gradient; RN has no gradient border primitive, so the
 * ring is a solid `ringColor` border on the outer circle with a small white
 * gap (the centered inner circle) between the border and the avatar image.
 */

export interface ResolveAvatarStyleArgs {
  size: number;
  ring: boolean;
  ringColor: string;
}

interface RingGeometry {
  ringWidth: number;
  gap: number;
}

function ringGeometry(size: number, ring: boolean): RingGeometry {
  if (!ring) return { ringWidth: 0, gap: 0 };
  return {
    ringWidth: Math.max(2, Math.round(size * 0.06)),
    gap: Math.max(2, Math.round(size * 0.05)),
  };
}

/** Diameter of the inner avatar circle once the ring + gap are subtracted. */
export function avatarInnerSize(size: number, ring: boolean): number {
  const { ringWidth, gap } = ringGeometry(size, ring);
  return size - (ringWidth + gap) * 2;
}

/** First non-space character of `name`, uppercased; "" if there is none. */
export function avatarFallbackInitial(name?: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length ? trimmed.charAt(0).toUpperCase() : "";
}

export function resolveAvatarStyle({
  size,
  ring,
  ringColor,
}: ResolveAvatarStyleArgs): { outer: ViewStyle; image: ImageStyle } {
  const { ringWidth } = ringGeometry(size, ring);
  const inner = avatarInnerSize(size, ring);

  return {
    outer: {
      width: size,
      height: size,
      borderRadius: theme.radius.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: ringWidth,
      borderColor: ring ? ringColor : "transparent",
      backgroundColor: ring ? theme.colors.white : "transparent",
    },
    image: {
      width: inner,
      height: inner,
      borderRadius: theme.radius.full,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.blue100,
    },
  };
}
