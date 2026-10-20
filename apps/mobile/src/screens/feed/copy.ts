/**
 * Screen-level Hebrew copy for the feed (ADR 0007). Strings that belong to a
 * @safeplace/ui component stay in that component's copy; this holds what the
 * screen itself adds. Masculine generic, never gendered by the user's gender.
 */
export const feedScreenCopy = {
  /** Not in the lab (open item): fold affordance for long posts. */
  readMore: "קרא עוד",
  /** Not in the lab: the Profile tab's placeholder wording. */
  profileComingSoon: {
    title: "הפרופיל בדרך",
    message: "בקרוב תוכל לראות כאן את הפרופיל שלך ואת מה ששמרת.",
  },
  /** Not in the lab: group / space / author pages arrive in Phase 5. */
  pageComingSoon: {
    title: "הדף הזה בדרך",
    message: "בקרוב תוכל להיכנס לכאן ולראות עוד.",
    back: "חזרה",
  },
  /** Not in the lab: shown when an author's name cannot be resolved. */
  unknownAuthor: "משתמש",
  searchTitle: "חיפוש",
  profileTitle: "פרופיל",
  time: {
    now: "עכשיו",
    minutes: (n: number) => `לפני ${n} דק׳`,
    hour: "לפני שעה",
    twoHours: "לפני שעתיים",
    hours: (n: number) => `לפני ${n} שעות`,
    yesterday: "אתמול",
    days: (n: number) => `לפני ${n} ימים`,
  },
} as const;

export type ReportCategoryKey =
  | "contains_women"
  | "harassment"
  | "dangerous_content"
  | "spam"
  | "misinformation"
  | "other";

/** Order = the report sheet's category index (07-moderation §3.3). */
export const REPORT_CATEGORY_ORDER: readonly ReportCategoryKey[] = [
  "contains_women",
  "harassment",
  "dangerous_content",
  "spam",
  "misinformation",
  "other",
];
