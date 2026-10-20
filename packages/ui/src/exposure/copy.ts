/**
 * Hebrew default copy for the exposure picker (ADR 0007: prop-overridable).
 * Source: feed-lab `exposure`, `exposureGroups`, `composeGroup`. Entries
 * marked "derived" are not drawn in the lab and are flagged for Eli.
 */
export const exposureCopy = {
  title: "מי יראה את זה?",
  subtitle: "אפשר לבחור יותר מקהל אחד.",
  public: "ציבורי",
  publicHint: "כולם — גלוי בפיד, ויכול להיות מוצע גם למי שאינו עוקב",
  followers: "העוקבים שלי",
  followersHint: "רק מי שעוקב אחריך",
  groups: "קבוצות",
  family: "מרחב משפחתי",
  familyBlockedHint: "לא ניתן לשלב עם קהלים מחוץ למשפחה",
  confirm: "אישור",
  /** Chip pieces. */
  chipPublic: "ציבורי",
  chipFollowers: "עוקבים",
  chipGroups: "קבוצות",
  /** derived: plural for several Family Spaces. */
  chipFamilySpaces: "מרחבים משפחתיים",
  /** derived: shown only for an empty selection (Publish is disabled then). */
  chipNone: "בחירת קהל",
  groupsStepTitle: "בחירת קבוצות",
  groupsStepSection: "הקבוצות שלי",
  /** derived (the lab says only that Family Spaces get their own list). */
  familyStepTitle: "בחירת מרחבים משפחתיים",
  familyStepSection: "המרחבים המשפחתיים שלי",
  membersSuffix: "חברים",
  confirmCount: (n: number) => `אישור · ${n} נבחרו`,
  lockedHelp: "פוסט שנכתב בקבוצה נשאר בקבוצה.",
} as const;

export type ExposureCopy = typeof exposureCopy;
