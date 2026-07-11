import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useRiseIn } from "@safeplace/ui";
import { WizardProgress } from "./WizardProgress";
import { theme } from "@/lib/theme";

/**
 * Shared frame for every onboarding step: a generous white canvas (spec
 * §6.3.5), an optional top progress bar for the 3 wizard steps, and a
 * keyboard-aware scroll area so form fields stay visible. Auxiliary auth
 * screens (sign-in, verify-email) omit `step` and render no bar.
 */
export function WizardScreen({ step, children }: { step?: number; children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {step !== undefined ? (
          <View style={{ paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md }}>
            <WizardProgress current={step} />
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: theme.spacing.xl,
            gap: theme.spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Staggered fade-and-rise entrance wrapper (§6.3.2): wrap each major block of
 * a step — heading, then form, then CTA — with an incrementing `index` so they
 * cascade in. Delegates to the shared useRiseIn hook, which gates on reduced
 * motion (§6.3.4).
 */
export function RiseIn({ index, children }: { index: number; children: ReactNode }) {
  const rise = useRiseIn(index);
  return <Animated.View style={rise}>{children}</Animated.View>;
}
