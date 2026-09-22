import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, type GradientToken } from "@safeplace/design-tokens";

/**
 * Full-bleed gradient backdrop for the onboarding screens (design-lab
 * FINAL-SPEC.md). `variant` picks a precomputed token:
 *  - "welcomeDual" — light cyan→near-white→cobalt (Craft welcome).
 *  - "fullBleed"   — cyan→indigo→deep-indigo (Sign-up / Defaults).
 * Gradients are absolute and do NOT mirror under RTL — matches the lab.
 */
export function ScreenGradient({
  variant,
  children,
}: {
  variant: keyof typeof gradients;
  children: ReactNode;
}) {
  const g: GradientToken = gradients[variant];
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={g.colors as unknown as readonly [string, string, ...string[]]}
        locations={g.locations as unknown as readonly [number, number, ...number[]]}
        start={g.start}
        end={g.end}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
