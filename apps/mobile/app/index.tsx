import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/lib/theme";

/**
 * PLACEHOLDER. This is not the onboarding "welcome" screen from
 * docs/product/00-master-spec.md §6.2.1 — it's a minimal wiring check
 * confirming RTL, design tokens, and the monorepo package graph all work
 * end to end from a fresh checkout.
 *
 * Next step: replace this with the real 3-step onboarding wizard. See
 * src/screens/onboarding/README.md and .claude/commands/new-screen.md.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safe-Place</Text>
      <Text style={styles.subtitle}>
        שלד הפרויקט מוכן. הצעד הבא: מסך ההקמה בן 3 הצעדים.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize["3xl"],
    fontWeight: theme.fontWeight.bold as "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
