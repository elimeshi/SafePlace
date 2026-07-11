/**
 * All user-facing Hebrew copy for the onboarding wizard, in one place.
 *
 * This is the app-level i18n seam (ADR 0007): screens never inline Hebrew
 * strings in logic, so a future `t()` layer can swap these for translated
 * catalogs without touching screen code. Copy is written gender-neutrally
 * (inclusive forms like "תוכל/י") per invariant #3 and master spec §3.6.1 —
 * the wizard must never frame a default as "how men/women must behave".
 */
export const onboardingCopy = {
  welcome: {
    tagline:
      "מרחב חברתי שמכבד את אורח חייך — אתה שולט במה שאתה רואה, ובמה שאתה חולק.",
    createAccount: "יצירת חשבון",
    signIn: "כניסה לחשבון קיים",
  },

  signup: {
    title: "יצירת חשבון",
    nameLabel: "שם מלא",
    emailLabel: "אימייל",
    passwordLabel: "סיסמה",
    genderLabel: "מגדר",
    // Rendered with the two key phrases emphasized; the linked legal documents
    // themselves are pending (see docs/legal/legal-tracker.md).
    termsPrefix: "קראתי ואני מסכים/ה ל",
    termsOfUse: "תנאי השימוש",
    termsAnd: " ול",
    privacyPolicy: "מדיניות הפרטיות",
    submit: "המשך",
    submitting: "יוצר חשבון…",
    haveAccount: "כבר יש לך חשבון?",
    goToSignIn: "כניסה",
    errors: {
      name: "יש להזין שם",
      emailRequired: "יש להזין כתובת אימייל",
      emailInvalid: "כתובת אימייל לא תקינה",
      passwordShort: "הסיסמה חייבת לכלול לפחות 6 תווים",
      gender: "יש לבחור מגדר כדי להמשיך",
      terms: "יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך",
    },
  },

  defaults: {
    title: "ברירות המחדל שלך",
    intro: "הגדרנו עבורך את ההעדפות הבאות. תוכל/י לשנותן בכל עת באזור האישי.",
    // Labels match the master spec §6.2.3 example. Phrased as the setting's
    // "on" meaning; the read-only toggle beside each shows its actual state
    // (on for the male defaults, off for the female defaults) — same labels,
    // same mechanism, symmetric for both (invariant #4).
    hideContentWithWomen: "אינך רואה תוכן הכולל נשים",
    hideWomenAccounts: "אינך רואה חשבונות שהוגדרו כנשיים",
    continue: "הבנתי, המשך",
  },

  verify: {
    title: "אישור כתובת האימייל",
    // {email} is substituted at render time.
    body: "שלחנו קישור אימות לכתובת {email}. יש לאשר אותו, ואז להיכנס לחשבון.",
    hint: "לא הגיע המייל? כדאי לבדוק גם בתיקיית הספאם.",
    goToSignIn: "מעבר לכניסה",
  },

  signin: {
    title: "כניסה",
    emailLabel: "אימייל",
    passwordLabel: "סיסמה",
    submit: "כניסה",
    submitting: "מתחבר…",
    noAccount: "אין לך חשבון?",
    goToSignUp: "יצירת חשבון",
    errors: {
      emailRequired: "יש להזין כתובת אימייל",
      emailInvalid: "כתובת אימייל לא תקינה",
      passwordRequired: "יש להזין סיסמה",
    },
  },
} as const;

/**
 * Hebrew fallback for auth errors coming back from Supabase/GoTrue (which are
 * English). Mapped by substring so wording changes upstream degrade to the
 * generic message rather than leaking English to the user.
 */
export const authErrorCopy = {
  invalidCredentials: "אימייל או סיסמה שגויים",
  emailNotConfirmed: "יש לאשר את כתובת האימייל לפני הכניסה. בדוק/י את תיבת הדואר.",
  userExists: "כתובת אימייל זו כבר רשומה. אפשר להיכנס לחשבון הקיים.",
  weakPassword: "הסיסמה חלשה מדי. יש לבחור סיסמה חזקה יותר.",
  network: "אירעה תקלת רשת. יש לבדוק את החיבור ולנסות שוב.",
  generic: "משהו השתבש. יש לנסות שוב עוד רגע.",
} as const;
