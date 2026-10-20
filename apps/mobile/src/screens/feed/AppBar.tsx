import { Text, View } from "react-native";
import { rubik } from "@safeplace/ui";
import { theme } from "@/lib/theme";

/**
 * The Safe·Place wordmark (lab `.wordmark`). A brand mark, not translatable
 * copy; always LTR so the dot sits between the two Latin words.
 */
export function WordMark() {
  return (
    <Text style={{ ...rubik(25, 700), color: theme.colors.primary, letterSpacing: -0.5, direction: "ltr" }}>
      Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place
    </Text>
  );
}

/** Lab `.appbar`: the wordmark on the feed, a page title on the placeholder tabs. */
export function AppBar({ title }: { title?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 4,
        paddingHorizontal: 18,
        paddingBottom: 8,
      }}
    >
      {title ? <Text style={{ ...rubik(22, 700), color: theme.colors.ink900 }}>{title}</Text> : <WordMark />}
    </View>
  );
}
