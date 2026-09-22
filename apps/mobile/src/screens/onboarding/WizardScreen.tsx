import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated from "react-native-reanimated";
import { useRiseIn } from "@safeplace/ui";
import { ScreenGradient } from "./ScreenGradient";
import { theme } from "@/lib/theme";

export type WizardVariant = "craft" | "fullbleed";

/** Cap the content column on wide screens (tablet / desktop web) so the
 * phone-native composition stays phone-shaped and centred. */
const MAX_CONTENT_WIDTH = 460;

/**
 * Shared frame for the onboarding steps, in the two locked compositions
 * (design-lab FINAL-SPEC.md):
 *  - "craft"    — Welcome: light "Dual" gradient (cyan → near-white → cobalt),
 *    a flex canvas the screen fills top-to-bottom (hero up top, CTAs pinned
 *    to the bottom). Dark status bar over the light ground.
 *  - "fullbleed" — Sign-up / Defaults: immersive cyan→indigo gradient with a
 *    keyboard-aware, vertically-centred scroll area for the glass card. Light
 *    status bar over the dark ground.
 * Auxiliary auth screens (sign-in, verify-email) don't use this frame.
 */
export function WizardScreen({
  variant,
  children,
}: {
  variant: WizardVariant;
  children: ReactNode;
}) {
  const gradient = variant === "craft" ? "welcomeDual" : "fullBleed";

  return (
    <ScreenGradient variant={gradient}>
      <StatusBar style={variant === "craft" ? "dark" : "light"} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {variant === "craft" ? (
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: MAX_CONTENT_WIDTH + 2 * theme.spacing.xl,
              alignSelf: "center",
              paddingHorizontal: 27.8, // lab .pad sides 3u
              paddingTop: 13.9, // lab .pad top 1.5u
              paddingBottom: 27.8, // lab .pad bottom 3u
              rowGap: 20.4, // lab .pad gap 2.2u (between every child)
              alignItems: "stretch",
            }}
          >
            {children}
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 27.8, // lab .fb-wrap padding 3u
                paddingVertical: theme.spacing.xl,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH }}>{children}</View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

/**
 * Staggered fade-and-rise entrance wrapper (§6.3.2): wrap each major block of
 * a step with an incrementing `index` so they cascade in. Delegates to the
 * shared useRiseIn hook, which gates on reduced motion (§6.3.4). `style` lets
 * the caller stretch the wrapper (e.g. full-width CTA blocks).
 */
export function RiseIn({
  index,
  children,
  style,
}: {
  index: number;
  children: ReactNode;
  style?: object;
}) {
  const rise = useRiseIn(index);
  return <Animated.View style={[rise, style]}>{children}</Animated.View>;
}
