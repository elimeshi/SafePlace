import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import type { IconName } from "../content/Icon.glyphs";
import { assistant, lh, rubik } from "../foundation/style";

/**
 * Lab `.empty`: a 64px icon disc, a Rubik-600 19px title and a 15px/1.6 message,
 * centred with a 10px rhythm. Three anatomies share it: empty feed (users
 * icon, primary CTA), load error (wifi-off, secondary CTA, 120px top), and the
 * "coming soon" tab placeholder (no CTA, 110px top).
 */
export type EmptyStateVariant = "empty" | "error" | "comingSoon";

export const EMPTY_VARIANTS: Record<EmptyStateVariant, { icon: IconName; paddingTop: number; actionVariant: "primary" | "secondary" }> = {
  empty: { icon: "users", paddingTop: 40, actionVariant: "primary" },
  error: { icon: "wifi-off", paddingTop: 120, actionVariant: "secondary" },
  comingSoon: { icon: "search", paddingTop: 110, actionVariant: "primary" },
};

export function resolveEmptyStateStyle(paddingTop: number): {
  container: ViewStyle;
  disc: ViewStyle;
  iconSize: number;
  title: TextStyle;
  message: TextStyle;
  action: ViewStyle;
} {
  return {
    container: { alignItems: "center", gap: 10, paddingTop, paddingBottom: 40, paddingHorizontal: 34 },
    disc: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.blue100, alignItems: "center", justifyContent: "center" },
    iconSize: 28,
    title: { ...rubik(19), color: theme.colors.ink900, marginTop: 6, textAlign: "center" },
    message: { ...assistant(15), lineHeight: lh(15, 1.6), color: theme.colors.ink500, textAlign: "center" },
    action: { marginTop: 8 },
  };
}
