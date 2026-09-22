import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Gender } from "@safeplace/visibility-policy";
import { Button, Checkbox, GenderChoice, SystemNotice, TextField } from "@safeplace/ui";
import { signUpWithGender } from "@safeplace/api-client";
import { supabase } from "@/lib/supabase";
import { WizardScreen, RiseIn } from "@/screens/onboarding/WizardScreen";
import { GlassCard } from "@/screens/onboarding/GlassCard";
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
 * Step 2 — Account details + gender selection (master spec §6.2.2), "Full-bleed"
 * composition (design-lab FINAL-SPEC.md): a cyan→indigo gradient behind a
 * frosted-glass card. Collects the only mandatory data (name, email, password),
 * the neutral gender choice (no loaded explanation here — its meaning is
 * deferred to Step 3, §6.1.1), and a single terms consent. On submit it calls
 * signUpWithGender: the gender rides in auth metadata and the DB trigger seeds
 * the gender-conditioned DEFAULTS (invariant #3 — defaults, not rules; never an
 * upload-side gate, invariant #1).
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
    <WizardScreen variant="fullbleed">
      <RiseIn index={0}>
        <GlassCard>
          <Text
            style={{
              fontFamily: theme.fontFamily.display,
              fontSize: 24, // lab .h-title is an <h2> → 1.5em
              lineHeight: 28, // 1.18
              color: theme.colors.white,
              marginTop: 20, // <h2> default 0.83em block margins (lab has no reset)
              marginBottom: 20,
            }}
          >
            {c.title}
          </Text>

          <TextField
            onGlass
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
            autoComplete="new-password"
            textContentType="newPassword"
            valid={password.length >= MIN_PASSWORD_LENGTH}
            errorText={errors.password}
          />

          <View style={{ gap: 8.4 /* lab doorlbl margin-bottom 0.9u */ }}>
            <Text
              style={{
                fontFamily: theme.fontFamily.semibold,
                fontSize: 11.5, // lab .doorlbl 0.72·fs
                letterSpacing: 0.96, // 0.06em
                color: theme.colors.white,
              }}
            >
              {c.genderLabel}
            </Text>
            <GenderChoice
              onGlass
              value={gender}
              onChange={(v) => {
                setGender(v as Gender);
                clearError("gender");
              }}
            />
            {errors.gender ? (
              <Text style={{ ...theme.typeRole.meta, color: theme.colors.white }}>{errors.gender}</Text>
            ) : null}
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <Checkbox
              onGlass
              checked={termsAccepted}
              onChange={(v) => {
                setTermsAccepted(v);
                clearError("terms");
              }}
              label={<TermsLabel />}
            />
            {errors.terms ? (
              <Text style={{ ...theme.typeRole.meta, color: theme.colors.white }}>{errors.terms}</Text>
            ) : null}
          </View>

          {formError ? <SystemNotice tone="danger" message={formError} /> : null}

          <Button variant="onGlass" size="onboarding" block disabled={submitting} onPress={handleSubmit}>
            {submitting ? c.submitting : c.submit}
          </Button>
        </GlassCard>
      </RiseIn>
    </WizardScreen>
  );
}

/**
 * Terms consent label with the two legal documents emphasized. On the glass
 * card the text and links are white (links underlined). The linked documents
 * themselves are pending legal sign-off (docs/legal/legal-tracker.md) so the
 * phrases are styled but not yet navigable.
 */
function TermsLabel() {
  const c = onboardingCopy.signup;
  // lab .terms p: 0.84·fs ≈ 13.4, line-height 1.5.
  const base = { fontFamily: theme.fontFamily.base, fontSize: 13.4, lineHeight: 20 };
  const linkStyle = {
    ...base,
    color: theme.colors.white,
    fontFamily: theme.fontFamily.semibold,
    textDecorationLine: "underline" as const,
  };
  return (
    <Text style={{ ...base, color: theme.colors.white }}>
      {c.termsPrefix}
      {/* TODO(legal): link to Terms of Use once the document exists — legal-tracker.md */}
      <Text style={linkStyle}>{c.termsOfUse}</Text>
      {c.termsAnd}
      {/* TODO(legal): link to Privacy Policy once the document exists — legal-tracker.md */}
      <Text style={linkStyle}>{c.privacyPolicy}</Text>
    </Text>
  );
}
