import { ActivityIndicator, Text, View } from "react-native";
import { theme } from "@/lib/theme";

/**
 * Neutral loading screen shown while the persisted session is read on cold
 * start (SessionProvider.initializing) and during route-guard hand-offs.
 * Deliberately quiet — the product wordmark, nothing else — so it never
 * flashes onboarding or app chrome before the auth state is known.
 */
export function Splash() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text style={{ ...theme.typeRole.h1, color: theme.colors.primary }}>
        Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place
      </Text>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
