import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";
import { assistant, lh, rubik } from "../foundation/style";

/** Lab `.quote` / `.quote.gone`: the embedded original inside a share-to-group quote post. */
export const QUOTE_BODY_LINES = 3;
export const QUOTE_MEDIA_HEIGHT = 120;

const shell: ViewStyle = {
  marginHorizontal: 16,
  marginBottom: 14,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.background,
  overflow: "hidden",
};

export function resolveQuoteStyle(): {
  container: ViewStyle;
  head: ViewStyle;
  name: TextStyle;
  time: TextStyle;
  body: TextStyle;
  media: ViewStyle;
  gone: ViewStyle;
  goneText: TextStyle;
  goneIconSize: number;
  avatarSize: number;
} {
  return {
    container: shell,
    head: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 11, paddingHorizontal: 12, paddingBottom: 6 },
    name: { ...rubik(13.5), color: theme.colors.ink900 },
    time: { ...assistant(12), color: theme.colors.ink400 },
    body: {
      ...assistant(14.5),
      lineHeight: lh(14.5, 1.55),
      color: theme.colors.ink700,
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    media: { height: QUOTE_MEDIA_HEIGHT, overflow: "hidden" },
    gone: { ...shell, flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
    goneText: { ...assistant(14), color: theme.colors.ink500 },
    goneIconSize: 18,
    avatarSize: 26,
  };
}
