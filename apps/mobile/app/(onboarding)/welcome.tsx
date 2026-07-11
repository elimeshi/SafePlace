import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@safeplace/ui";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { theme } from "@/lib/theme";

/**
 * Step 1 — Welcome (master spec §6.2.1). Not a form: the product's "front
 * door", carrying one feeling ("you've reached the right place"). Deliberately
 * minimal — wordmark, one value sentence, two prominent actions. No feature
 * list, so a user who isn't interested leaves without filling anything in
 * (§6.1.1 "quick exit").
 */
export default function Welcome() {
  const router = useRouter();
  const c = onboardingCopy.welcome;

  return (
    <WizardScreen step={1}>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.xl }}>
        <RiseIn index={0}>
          <Text style={{ ...theme.typeRole.h1, color: theme.colors.primary, textAlign: "center" }}>
            Safe<Text style={{ color: theme.colors.accent }}>·</Text>Place
          </Text>
        </RiseIn>

        <RiseIn index={1}>
          <Text
            style={{
              ...theme.typeRole.h3,
              fontFamily: theme.typeRole.body.fontFamily,
              color: theme.colors.textSecondary,
              textAlign: "center",
            }}
          >
            {c.tagline}
          </Text>
        </RiseIn>

        <RiseIn index={2}>
          <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
            <Button variant="cta" halo block onPress={() => router.push("/signup")}>
              {c.createAccount}
            </Button>
            <Button variant="secondary" block onPress={() => router.push("/signin")}>
              {c.signIn}
            </Button>
          </View>
        </RiseIn>
      </View>
    </WizardScreen>
  );
}
