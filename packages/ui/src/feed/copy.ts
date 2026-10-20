/**
 * Hebrew default copy for the feed pieces (ADR 0007): every component takes
 * these as overridable props. Masculine generic, never gendered by the user's
 * declared gender (phase-4 plan §1). Source: feed-lab.html.
 */
export const feedCopy = {
  createLabel: "יצירה",
  statusesEmptyHint: "כאן יופיעו סטטוסים של אנשים שאתה עוקב אחריהם.",
  spacesTitle: "המרחבים שלי",
  stripExpand: "הקש להרחבה",
  stripCollapse: "הקש לכיווץ",
  followTitle: "הצעות למעקב",
  followButton: "עקוב",
  followersSuffix: "עוקבים",
  /** Invisible accessibility label (not in the lab). */
  dismissA11y: "סגירה",
  tabHome: "בית",
  tabSearch: "חיפוש",
  tabProfile: "פרופיל",
} as const;

export type FeedCopy = typeof feedCopy;

/** "2431" → "2,431" without Intl (Hermes Intl coverage differs per platform). */
export function formatCount(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
