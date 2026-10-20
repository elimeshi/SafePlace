import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import { assistant, rubik } from "../foundation/style";

/**
 * Pure styling for InteractionBar (feed lab `.ibar` for the card, `.pbar` for
 * the single-post screen). Deliberately restrained (CLAUDE.md §8): like,
 * comment, share, save, with a quiet number. The like count is a number only
 * — never a list, never a separate tap target (invariant #5, plan §2 Likes).
 */

export type InteractionBarVariant = "card" | "post";

export interface InteractionIconStateArgs {
  liked?: boolean;
  saved?: boolean;
}

export interface InteractionIconState {
  /** Lab `--like`: an active like is indigo #2E3A8C (locked choice). */
  heartColor: string;
  heartFilled: boolean;
  /** The lab fills a saved bookmark but keeps the neutral ink. */
  bookmarkColor: string;
  bookmarkFilled: boolean;
  iconNeutral: string;
}

export function interactionIconState({
  liked,
  saved,
}: InteractionIconStateArgs): InteractionIconState {
  const iconNeutral = theme.colors.ink500;
  return {
    heartColor: liked ? theme.colors.primary : iconNeutral,
    heartFilled: Boolean(liked),
    bookmarkColor: iconNeutral,
    bookmarkFilled: Boolean(saved),
    iconNeutral,
  };
}

export function resolveBarStyle(variant: InteractionBarVariant): ViewStyle {
  if (variant === "post") {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.ink100,
      borderBottomColor: theme.colors.ink100,
    };
  }
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink100,
  };
}

export function resolveActionStyle(variant: InteractionBarVariant): ViewStyle {
  return variant === "post"
    ? { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 11, paddingHorizontal: 14 }
    : {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 12,
      };
}

export function resolveCountStyle(variant: InteractionBarVariant): TextStyle {
  return variant === "post"
    ? { ...rubik(15), fontVariant: ["tabular-nums"] }
    : { ...assistant(14, 600), fontVariant: ["tabular-nums"] };
}

/** Pushes `save` to the far end (start of the row stays like/comment/share). */
export const spacerStyle: ViewStyle = { flex: 1 };
