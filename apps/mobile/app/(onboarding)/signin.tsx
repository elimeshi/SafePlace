import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, SystemNotice, TextField } from "@safeplace/ui";
import { signIn } from "@safeplace/api-client";
import { supabase } from "@/lib/supabase";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
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
    <WizardScreen>
      <RiseIn index={0}>
        <Text style={{ ...theme.typeRole.h2, color: theme.colors.textPrimary }}>{c.title}</Text>
      </RiseIn>

      <RiseIn index={1}>
        <View style={{ gap: theme.spacing.lg }}>
          <TextField
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
        </View>
      </RiseIn>

      <RiseIn index={2}>
        <View style={{ gap: theme.spacing.md }}>
          {formError ? <SystemNotice tone="danger" message={formError} /> : null}
          <Button variant="cta" halo block disabled={submitting} onPress={handleSubmit}>
            {submitting ? c.submitting : c.submit}
          </Button>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: theme.spacing.xs }}>
            <Text style={{ ...theme.typeRole.meta, color: theme.colors.textSecondary }}>{c.noAccount}</Text>
            <Text
              onPress={() => router.push("/signup")}
              style={{ ...theme.typeRole.meta, color: theme.colors.primary, fontFamily: theme.typeRole.bodyStrong.fontFamily }}
            >
              {c.goToSignUp}
            </Text>
          </View>
        </View>
      </RiseIn>
    </WizardScreen>
  );
}
