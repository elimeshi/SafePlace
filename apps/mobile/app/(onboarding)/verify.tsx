import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@safeplace/ui";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { GlassCard } from "@/screens/onboarding/GlassCard";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { theme } from "@/lib/theme";

/**
 * Verify-email gate. Reached after Step 3 when email confirmation is ON: the
 * account exists but has no session yet, so the user must confirm via the
 * emailed link, then sign in. Not one of the three wizard steps (no progress
 * bar) — it's the hand-off between "account created" and "signed in".
 *
 * MVP: the user confirms in their mail app and returns to sign in. Auto-return
 * via a deep link (safeplace://) is a later enhancement.
 */
export default function VerifyEmail() {
  const router = useRouter();
  const c = onboardingCopy.verify;
  const { email } = useLocalSearchParams<{ email: string }>();
  const body = c.body.replace("{email}", email && email.length > 0 ? email : "");

  return (
    <WizardScreen variant="fullbleed">
      <RiseIn index={0}>
        <GlassCard>
          <Text style={{ ...theme.typeRole.h2, color: theme.colors.white, textAlign: "center" }}>
            {c.title}
          </Text>
          <Text style={{ ...theme.typeRole.body, color: "rgba(255,255,255,0.9)", textAlign: "center" }}>
            {body}
          </Text>
          <Text style={{ ...theme.typeRole.meta, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
            {c.hint}
          </Text>
          <Button variant="onGlass" size="lg" halo block onPress={() => router.replace("/signin")}>
            {c.goToSignIn}
          </Button>
        </GlassCard>
      </RiseIn>
    </WizardScreen>
  );
}
