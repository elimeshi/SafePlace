import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Gender } from "@safeplace/visibility-policy";
import { Button, Checkbox, GenderChoice, SystemNotice, TextField } from "@safeplace/ui";
import { signUpWithGender } from "@safeplace/api-client";
import { supabase } from "@/lib/supabase";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { onboardingCopy } from "@/screens/onboarding/copy";
import { mapAuthError } from "@/screens/onboarding/authErrors";
import {
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  validateSignup,
  hasErrors,
  type SignupErrors,
} from "@/screens/onboarding/validation";
import { theme } from "@/lib/theme";

/**
 * Step 2 — Account details + gender selection (master spec §6.2.2). Collects
 * the only mandatory data (name, email, password), the neutral gender choice
 * (no loaded explanation here — its meaning is deferred to Step 3, §6.1.1),
 * and a single terms consent. On submit it calls signUpWithGender: the gender
 * rides in auth metadata and the DB trigger seeds the gender-conditioned
 * DEFAULTS (invariant #3 — defaults, not rules; never an upload-side gate,
 * invariant #1).
 *
 * With email confirmation ON, signUp returns no session; we still advance to
 * Step 3 (which needs only the chosen gender), then to the verify-email gate.
 */
export default function SignUp() {
  const router = useRouter();
  const c = onboardingCopy.signup;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = (field: keyof SignupErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  async function handleSubmit() {
    if (submitting) return;
    setFormError(null);
    const nextErrors = validateSignup({ name, email, password, gender, termsAccepted });
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await signUpWithGender(supabase, {
        email: email.trim(),
        password,
        gender: gender as Gender,
        displayName: name.trim(),
      });
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      // Carry the chosen gender + email forward: Step 3 resolves the defaults
      // from the gender (no session yet), and verify-email shows the address.
      router.push({ pathname: "/defaults", params: { gender: gender as Gender, email: email.trim() } });
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WizardScreen step={2}>
      <RiseIn index={0}>
        <Text style={{ ...theme.typeRole.h2, color: theme.colors.textPrimary }}>{c.title}</Text>
      </RiseIn>

      <RiseIn index={1}>
        <View style={{ gap: theme.spacing.lg }}>
          <TextField
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError("name");
            }}
            label={c.nameLabel}
            autoComplete="name"
            valid={name.trim().length > 0}
            errorText={errors.name}
          />
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
            autoComplete="new-password"
            textContentType="newPassword"
            valid={password.length >= MIN_PASSWORD_LENGTH}
            errorText={errors.password}
          />

          <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ ...theme.typeRole.label, color: theme.colors.textSecondary }}>
              {c.genderLabel}
            </Text>
            <GenderChoice
              value={gender}
              onChange={(v) => {
                setGender(v as Gender);
                clearError("gender");
              }}
            />
            {errors.gender ? (
              <Text style={{ ...theme.typeRole.meta, color: theme.colors.danger }}>{errors.gender}</Text>
            ) : null}
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <Checkbox
              checked={termsAccepted}
              onChange={(v) => {
                setTermsAccepted(v);
                clearError("terms");
              }}
              label={<TermsLabel />}
            />
            {errors.terms ? (
              <Text style={{ ...theme.typeRole.meta, color: theme.colors.danger }}>{errors.terms}</Text>
            ) : null}
          </View>
        </View>
      </RiseIn>

      <RiseIn index={2}>
        <View style={{ gap: theme.spacing.md }}>
          {formError ? <SystemNotice tone="danger" message={formError} /> : null}
          <Button variant="cta" halo block disabled={submitting} onPress={handleSubmit}>
            {submitting ? c.submitting : c.submit}
          </Button>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: theme.spacing.xs }}>
            <Text style={{ ...theme.typeRole.meta, color: theme.colors.textSecondary }}>{c.haveAccount}</Text>
            <Text
              onPress={() => router.push("/signin")}
              style={{ ...theme.typeRole.meta, color: theme.colors.primary, fontFamily: theme.typeRole.bodyStrong.fontFamily }}
            >
              {c.goToSignIn}
            </Text>
          </View>
        </View>
      </RiseIn>
    </WizardScreen>
  );
}

/**
 * Terms consent label with the two legal documents emphasized. The linked
 * documents themselves are pending legal sign-off (docs/legal/legal-tracker.md)
 * so the phrases are styled but not yet navigable.
 */
function TermsLabel() {
  const c = onboardingCopy.signup;
  const linkStyle = {
    ...theme.typeRole.body,
    color: theme.colors.primary,
    fontFamily: theme.typeRole.bodyStrong.fontFamily,
  };
  return (
    <Text style={{ ...theme.typeRole.body, color: theme.colors.textPrimary }}>
      {c.termsPrefix}
      {/* TODO(legal): link to Terms of Use once the document exists — legal-tracker.md */}
      <Text style={linkStyle}>{c.termsOfUse}</Text>
      {c.termsAnd}
      {/* TODO(legal): link to Privacy Policy once the document exists — legal-tracker.md */}
      <Text style={linkStyle}>{c.privacyPolicy}</Text>
    </Text>
  );
}
