import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@safeplace/ui";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
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
    <WizardScreen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.lg }}>
        <RiseIn index={0}>
          <Text style={{ ...theme.typeRole.h2, color: theme.colors.textPrimary, textAlign: "center" }}>
            {c.title}
          </Text>
        </RiseIn>
        <RiseIn index={1}>
          <Text style={{ ...theme.typeRole.body, color: theme.colors.textSecondary, textAlign: "center" }}>
            {body}
          </Text>
        </RiseIn>
        <RiseIn index={2}>
          <Text style={{ ...theme.typeRole.meta, color: theme.colors.ink400, textAlign: "center" }}>
            {c.hint}
          </Text>
        </RiseIn>
        <RiseIn index={3}>
          <Button variant="cta" halo block onPress={() => router.replace("/signin")}>
            {c.goToSignIn}
          </Button>
        </RiseIn>
      </View>
    </WizardScreen>
  );
}
