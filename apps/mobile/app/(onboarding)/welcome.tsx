import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Icon } from "@safeplace/ui";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { SaturnHero } from "@/screens/onboarding/SaturnHero";
import { Pdots } from "@/screens/onboarding/Pdots";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { theme } from "@/lib/theme";

/**
 * Step 1 — Welcome (master spec §6.2.1), "Craft" composition (design-lab
 * FINAL-SPEC.md): a light Dual-gradient ground, the 3D Saturn hero up top, the
 * wordmark + one value sentence, and two prominent actions pinned to the
 * bottom. Not a form — the product's "front door", carrying one feeling.
 *
 * Measurements are the lab's exact values (u = 8·1.16 = 9.28, fs = 16): the
 * per-child rhythm (2.2u gap + springs) lives on the craft container in
 * WizardScreen; this file supplies the children in the lab's order.
 */
export default function Welcome() {
  const router = useRouter();
  const c = onboardingCopy.welcome;

  return (
    <WizardScreen variant="craft">
      {/* Decorative close (lab .close-x). No onboarding-exit destination is
          defined yet, so it is presentational — wire it when one exists. */}
      <View
        style={{
          alignSelf: "center",
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
        }}
      >
        <Icon name="x" size={15} color={theme.colors.textSecondary} />
      </View>

      <RiseIn index={0} style={{ alignItems: "center" }}>
        <Pdots current={1} />
      </RiseIn>

      {/* lab .spring with max-height 2u */}
      <View style={{ height: 18.6 }} />

      <RiseIn index={1} style={{ alignItems: "center" }}>
        <SaturnHero />
      </RiseIn>

      <RiseIn index={2} style={{ alignSelf: "stretch" }}>
        <Text
          style={{
            fontFamily: theme.fontFamily.display,
            fontSize: 36.8, // 2.3·fs
            lineHeight: 44,
            color: theme.colors.primary,
            textAlign: "center",
            letterSpacing: -0.32, // -0.02em
          }}
        >
          Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place
        </Text>
      </RiseIn>

      <RiseIn index={3} style={{ alignSelf: "stretch", paddingHorizontal: 6 }}>
        <Text
          style={{
            fontFamily: theme.fontFamily.base,
            fontSize: 16.3, // 1.02·fs
            lineHeight: 26.4, // 1.62
            color: theme.colors.textSecondary,
            textAlign: "center",
          }}
        >
          {c.tagline}
        </Text>
      </RiseIn>

      <View style={{ flex: 1 }} />

      <RiseIn index={4} style={{ alignSelf: "stretch" }}>
        <View style={{ gap: 13 }}>
          <Button variant="primary" size="onboarding" halo block onPress={() => router.push("/signup")}>
            {c.createAccount}
          </Button>
          <Button variant="secondary" size="onboarding" block onPress={() => router.push("/signin")}>
            {c.signIn}
          </Button>
        </View>
      </RiseIn>
    </WizardScreen>
  );
}
