import { describe, expect, it } from "vitest";
import {
  hasErrors,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  validateSignin,
  validateSignup,
  type SignupValues,
} from "../validation";
import { onboardingCopy } from "../copy";

const validSignup: SignupValues = {
  name: "ישראל ישראלי",
  email: "israel@example.com",
  password: "s3cret!",
  gender: "male",
  termsAccepted: true,
};

describe("isValidEmail", () => {
  it.each(["a@b.co", "israel.israeli@example.co.il", "x_y+z@sub.domain.org"])(
    "accepts %s",
    (email) => expect(isValidEmail(email)).toBe(true)
  );

  it.each(["", "no-at", "no@dot", "a@b.", "spaces in@x.com", "@x.com"])(
    "rejects %s",
    (email) => expect(isValidEmail(email)).toBe(false)
  );

  it("trims surrounding whitespace before validating", () => {
    expect(isValidEmail("  israel@example.com  ")).toBe(true);
  });
});

describe("validateSignup", () => {
  it("returns no errors for a fully valid form", () => {
    const errors = validateSignup(validSignup);
    expect(hasErrors(errors)).toBe(false);
  });

  it("flags an empty name", () => {
    expect(validateSignup({ ...validSignup, name: "   " }).name).toBe(
      onboardingCopy.signup.errors.name
    );
  });

  it("distinguishes missing vs malformed email", () => {
    expect(validateSignup({ ...validSignup, email: "" }).email).toBe(
      onboardingCopy.signup.errors.emailRequired
    );
    expect(validateSignup({ ...validSignup, email: "nope" }).email).toBe(
      onboardingCopy.signup.errors.emailInvalid
    );
  });

  it(`requires a password of at least ${MIN_PASSWORD_LENGTH} chars`, () => {
    expect(validateSignup({ ...validSignup, password: "12345" }).password).toBe(
      onboardingCopy.signup.errors.passwordShort
    );
    expect(validateSignup({ ...validSignup, password: "123456" }).password).toBeUndefined();
  });

  it("requires a gender selection (null or bogus value rejected)", () => {
    expect(validateSignup({ ...validSignup, gender: null }).gender).toBe(
      onboardingCopy.signup.errors.gender
    );
  });

  it("requires the terms checkbox", () => {
    expect(validateSignup({ ...validSignup, termsAccepted: false }).terms).toBe(
      onboardingCopy.signup.errors.terms
    );
  });

  it("accepts female as a valid gender (symmetry)", () => {
    expect(validateSignup({ ...validSignup, gender: "female" }).gender).toBeUndefined();
  });
});

describe("validateSignin", () => {
  it("passes with a valid email + any non-empty password", () => {
    expect(hasErrors(validateSignin({ email: "a@b.co", password: "x" }))).toBe(false);
  });

  it("flags a malformed email and an empty password", () => {
    const errors = validateSignin({ email: "bad", password: "" });
    expect(errors.email).toBe(onboardingCopy.signin.errors.emailInvalid);
    expect(errors.password).toBe(onboardingCopy.signin.errors.passwordRequired);
  });
});
