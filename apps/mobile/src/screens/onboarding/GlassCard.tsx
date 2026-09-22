import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "@/lib/theme";

const isWeb = Platform.OS === "web";

/**
 * Frosted-glass card for the full-bleed onboarding screens (design-lab
 * FINAL-SPEC.md — `.glass`): the lab recipe is exactly `rgba(255,255,255,.16)`
 * over an 18px backdrop-blur of the gradient, a 1px `rgba(255,255,255,.28)`
 * hairline, radius 24, and no drop shadow.
 *
 * That recipe decouples blur strength from white opacity, which expo-blur does
 * not (higher intensity = more white). So:
 *  - web: a plain surface with the exact 16% white + a real CSS
 *    `backdrop-filter: blur(18px)` — a 1:1 match with the lab.
 *  - native: a single BlurView (its own light frost is the glass; no extra
 *    white fill on top, which is what made it read milky/grey before).
 * Either way the cyan→indigo gradient shows through, frosted.
 */
// Web-only surface: exact lab glass — 16% white + a real backdrop blur of the
// gradient. Kept outside StyleSheet.create because backdrop-filter is not in
// RN's style types; react-native-web forwards it to the DOM.
const webGlass = {
  backgroundColor: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
} as unknown as ViewStyle;

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, isWeb ? webGlass : null, style]}>
      {isWeb ? null : (
        <BlurView
          intensity={26}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}
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
    // Lab `.glass` has no shadow; keep only a whisper of depth on device.
    shadowColor: "#0A1230",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  content: {
    padding: 24, // lab .glass padding 2.6u
    gap: 17, // lab .glass gap 1.8u
  },
});
