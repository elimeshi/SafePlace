import type { Gender } from "@safeplace/visibility-policy";
import { onboardingCopy } from "./copy";

/**
 * Pure, framework-free validation for the onboarding forms. Kept out of the
 * React components so it is unit-testable in isolation (see
 * __tests__/validation.test.ts) — the screens call these and render the
 * returned Hebrew messages.
 */

/** Supabase's default minimum; keep in sync with the project's auth settings. */
export const MIN_PASSWORD_LENGTH = 6;

// Deliberately permissive: catches obvious typos (missing @, spaces, no dot in
// domain) without trying to fully parse RFC 5322. Real deliverability is
// proven by the email-confirmation step, not a regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface SignupValues {
  name: string;
  email: string;
  password: string;
  gender: Gender | null;
  termsAccepted: boolean;
}

export interface SignupErrors {
  name?: string;
  email?: string;
  password?: string;
  gender?: string;
  terms?: string;
}

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  const c = onboardingCopy.signup.errors;

  if (values.name.trim().length === 0) errors.name = c.name;

  if (values.email.trim().length === 0) errors.email = c.emailRequired;
  else if (!isValidEmail(values.email)) errors.email = c.emailInvalid;

  if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = c.passwordShort;

  if (values.gender !== "male" && values.gender !== "female") errors.gender = c.gender;

  if (!values.termsAccepted) errors.terms = c.terms;

  return errors;
}

export interface SigninValues {
  email: string;
  password: string;
}

export interface SigninErrors {
  email?: string;
  password?: string;
}

export function validateSignin(values: SigninValues): SigninErrors {
  const errors: SigninErrors = {};
  const c = onboardingCopy.signin.errors;

  if (values.email.trim().length === 0) errors.email = c.emailRequired;
  else if (!isValidEmail(values.email)) errors.email = c.emailInvalid;

  if (values.password.length === 0) errors.password = c.passwordRequired;

  return errors;
}

/** True when a validation result object has at least one field error. */
export function hasErrors(errors: SignupErrors | SigninErrors): boolean {
  return Object.values(errors).some((v) => v !== undefined);
}
