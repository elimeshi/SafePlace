import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, SystemNotice, TextField } from "@safeplace/ui";
import { signIn } from "@safeplace/api-client";
import { supabase } from "@/lib/supabase";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { GlassCard } from "@/screens/onboarding/GlassCard";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { mapAuthError } from "@/screens/onboarding/authErrors";
import { isValidEmail, validateSignin, hasErrors, type SigninErrors } from "@/screens/onboarding/validation";
import { theme } from "@/lib/theme";

/**
 * Sign-in. Reached from Step 1 (existing account) or after email verification.
 * On success the session appears; the (onboarding) layout observes it and
 * redirects into the app — this screen never navigates on its own, so there's
 * a single source of truth for "signed in → app".
 */
export default function SignIn() {
  const router = useRouter();
  const c = onboardingCopy.signin;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SigninErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = (field: keyof SigninErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  async function handleSubmit() {
    if (submitting) return;
    setFormError(null);
    const nextErrors = validateSignin({ email, password });
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await signIn(supabase, email.trim(), password);
      if (error) setFormError(mapAuthError(error));
      // On success: do nothing here — onAuthStateChange drives the redirect.
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WizardScreen variant="fullbleed">
      <RiseIn index={0}>
        <GlassCard>
          <Text style={{ ...theme.typeRole.h2, color: theme.colors.white }}>{c.title}</Text>

          <TextField
            onGlass
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError("email");
            }}
            label={c.emailLabel}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            valid={isValidEmail(email)}
            errorText={errors.email}
          />
          <TextField
            onGlass
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearError("password");
            }}
            label={c.passwordLabel}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            errorText={errors.password}
          />

          {formError ? <SystemNotice tone="danger" message={formError} /> : null}

          <Button variant="onGlass" size="lg" halo block disabled={submitting} onPress={handleSubmit}>
            {submitting ? c.submitting : c.submit}
          </Button>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: theme.spacing.xs }}>
            <Text style={{ ...theme.typeRole.meta, color: "rgba(255,255,255,0.85)" }}>{c.noAccount}</Text>
            <Text
              onPress={() => router.push("/signup")}
              style={{
                ...theme.typeRole.meta,
                color: theme.colors.white,
                fontFamily: theme.typeRole.bodyStrong.fontFamily,
                textDecorationLine: "underline",
              }}
            >
              {c.goToSignUp}
            </Text>
          </View>
        </GlassCard>
      </RiseIn>
    </WizardScreen>
  );
}
