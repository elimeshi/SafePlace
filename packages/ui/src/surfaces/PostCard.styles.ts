import type { ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Which media state a post card should render. The `filtered` case is the UI
 * layer of the visibility system — a modest placeholder instead of the media.
 * This is defense-in-depth ONLY: real enforcement is server/DB-side (CLAUDE.md
 * invariant #2). The component never decides visibility itself; the caller
 * passes `filtered` after consulting packages/visibility-policy / RLS.
 */
export type PostCardMediaMode = "image" | "filtered" | "none";

export function postCardMediaMode({
  hasMedia,
  filtered,
}: {
  hasMedia: boolean;
  filtered: boolean;
}): PostCardMediaMode {
  if (!hasMedia) return "none";
  return filtered ? "filtered" : "image";
}

/** The "Facebook-lite" card shell: white surface, subtle frame, soft corners, restrained shadow. */
export function resolveCardStyle(): ViewStyle {
  return {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...theme.elevation.card,
  };
}
