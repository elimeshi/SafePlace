import type { TextStyle, ViewStyle } from "react-native";
import { feedColors, shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

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

/** Lab `.card.soft`: white, radius 24, shadow only — no border (locked choice). */
export function resolveCardStyle(variant: "card" | "detail" = "card"): ViewStyle {
  if (variant === "detail") return { backgroundColor: theme.colors.surface };
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: shadows.soft,
  };
}

export const POST_MEDIA_HEIGHT = 230;
export const POST_AVATAR_SIZE = 42;
/** Single-post screen: lab `postFull` uses a 44px avatar. */
export const POST_DETAIL_AVATAR_SIZE = 44;

export function resolvePostCardParts(): {
  header: ViewStyle;
  who: ViewStyle;
  nameRow: ViewStyle;
  name: TextStyle;
  time: TextStyle;
  more: ViewStyle;
  body: TextStyle;
  readMore: TextStyle;
  location: ViewStyle;
  locationText: TextStyle;
  mediaGround: ViewStyle;
  sharedBy: ViewStyle;
  sharedByText: TextStyle;
} {
  return {
    header: { flexDirection: "row", alignItems: "flex-start", gap: 11, paddingTop: 15, paddingHorizontal: 16, paddingBottom: 10 },
    who: { flex: 1, minWidth: 0, flexDirection: "column", gap: 5 },
    nameRow: { flexDirection: "row", alignItems: "baseline", gap: 7, flexWrap: "wrap" },
    name: { ...rubik(15), color: theme.colors.ink900 },
    time: { ...assistant(13), color: theme.colors.ink400 },
    more: { marginTop: -4 },
    body: {
      ...assistant(16),
      lineHeight: lh(16, 1.62),
      color: theme.colors.ink900,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    readMore: { ...assistant(16, 600), color: theme.colors.primary },
    location: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 16, paddingBottom: 10 },
    locationText: { ...assistant(13), color: theme.colors.ink500 },
    mediaGround: { backgroundColor: feedColors.mediaGround, overflow: "hidden" },
    sharedBy: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
    sharedByText: { ...assistant(12.5, 600), color: theme.colors.ink400 },
  };
}
