import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import { rubik } from "../foundation/style";

/**
 * Pure styling for Avatar. Lab `.av` / `.av.ring`: a round blue100 disc with
 * a Rubik-600 initial at 0.42× the diameter; the unseen-status ring is a
 * 2.5px white gap plus a 5px accent ring painted *outside* the disc
 * (`box-shadow: 0 0 0 2.5px surface, 0 0 0 5px accent`), so the disc keeps
 * its full size.
 */

export interface ResolveAvatarStyleArgs {
  size: number;
  ring: boolean;
  ringColor: string;
}

/** Diameter of the visible disc (the ring is painted outside it). */
export function avatarInnerSize(size: number, _ring?: boolean): number {
  return size;
}

/** First non-space character of `name`, uppercased; "" if there is none. */
export function avatarFallbackInitial(name?: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length ? trimmed.charAt(0).toUpperCase() : "";
}

export function avatarFontSize(size: number): number {
  return Math.round(size * 0.42);
}

export function resolveAvatarStyle({
  size,
  ring,
  ringColor,
}: ResolveAvatarStyleArgs): { outer: ViewStyle; image: ImageStyle; initial: TextStyle } {
  return {
    outer: {
      width: size,
      height: size,
      borderRadius: theme.radius.full,
      alignItems: "center",
      justifyContent: "center",
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: theme.colors.blue100,
      overflow: ring ? "visible" : "hidden",
      ...(ring ? { boxShadow: `0 0 0 2.5px ${theme.colors.surface}, 0 0 0 5px ${ringColor}` } : null),
    },
    image: {
      width: size,
      height: size,
      borderRadius: theme.radius.full,
    },
    initial: {
      ...rubik(avatarFontSize(size)),
      color: theme.colors.primary,
    },
  };
}
