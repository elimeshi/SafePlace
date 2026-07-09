import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for InteractionBar — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/content/InteractionBar.jsx. Deliberately
 * restrained: like, comment, share, save — no social-pressure UI beyond a
 * quiet count (CLAUDE.md §8).
 */

export interface InteractionIconStateArgs {
  liked?: boolean;
  saved?: boolean;
}

export interface InteractionIconState {
  heartColor: string;
  bookmarkColor: string;
  iconNeutral: string;
}

/**
 * Resolves the heart/bookmark tint. `liked` tints the heart with `danger`;
 * `saved` tints the bookmark with `primary`. Otherwise both fall back to the
 * same neutral ink so the row reads as calm/unopinionated by default.
 */
export function interactionIconState({
  liked,
  saved,
}: InteractionIconStateArgs): InteractionIconState {
  const iconNeutral = theme.colors.ink500;
  return {
    heartColor: liked ? theme.colors.danger : iconNeutral,
    bookmarkColor: saved ? theme.colors.primary : iconNeutral,
    iconNeutral,
  };
}

export const rowStyle: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.xs,
};

/** Pushes `save` to the far end (start of the row stays like/comment/share). */
export const spacerStyle: ViewStyle = {
  flex: 1,
};

export const actionStyle: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
  paddingVertical: 8,
  paddingHorizontal: 10,
  minHeight: 40,
  borderRadius: theme.radius.md,
};

export const countStyle: TextStyle = {
  ...theme.typeRole.meta,
  fontFamily: theme.fontFamily.numeric,
};
