import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { theme } from "@/lib/theme";

const isWeb = Platform.OS === "web";

/**
 * Frosted-glass card for the full-bleed onboarding screens (design-lab
 * FINAL-SPEC.md — `.glass`): the lab recipe is exactly `rgba(255,255,255,.16)`
 * over an 18px backdrop-blur of the gradient, a 1px `rgba(255,255,255,.28)`
 * hairline, radius 24, and no drop shadow.
 *
 *  - web: the exact recipe — 16% white + a real CSS `backdrop-filter:blur(18px)`.
 *  - native: the gradient behind the card is already smooth, so backdrop-blur
 *    is a visual no-op; expo-blur, meanwhile, couples blur strength to a milky
 *    white fill that washed the card out (near-white fields lost contrast and
 *    "bloomed" into it). So skip blur entirely and paint the lab's actual look:
 *    a thin translucent white veil over the gradient. Crisp, matches the lab.
 */
// Web-only surface — kept outside StyleSheet.create because backdrop-filter is
// not in RN's style types; react-native-web forwards it to the DOM.
const webGlass = {
  backgroundColor: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
} as unknown as ViewStyle;

// Native surface — the lab's 16% veil (a touch lower so the gradient reads
// through and the white fields stay crisp against it).
const nativeGlass: ViewStyle = { backgroundColor: "rgba(255,255,255,0.14)" };

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, isWeb ? webGlass : nativeGlass, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
    // Lab `.glass` has no shadow — a dark drop shadow here only muddied the
    // edges, so keep the card flat and let the hairline define it.
  },
  content: {
    padding: 24, // lab .glass padding 2.6u
    gap: 17, // lab .glass gap 1.8u
  },
});
