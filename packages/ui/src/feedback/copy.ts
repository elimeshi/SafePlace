/**
 * Hebrew default copy for empty / error / coming-soon states and the report
 * toast (ADR 0007: prop-overridable). Source: feed-lab.html, 07-moderation §3.4.
 */
export const feedbackCopy = {
  emptyFeed: {
    title: "הפיד שלך עדיין שקט",
    message: "כשתעקוב אחרי אנשים או תצטרף לקבוצות, הפוסטים שלהם יופיעו כאן. בינתיים אפשר לשתף משהו משלך.",
    action: "יצירת פוסט",
  },
  feedError: {
    title: "לא הצלחנו לטעון את הפיד",
    message: "ייתכן שאין חיבור לאינטרנט כרגע. נסה שוב בעוד רגע.",
    action: "נסה שוב",
  },
  /** The Search placeholder; the Profile tab's wording is not in the lab (pass it in). */
  searchComingSoon: {
    title: "החיפוש בדרך",
    message: "בקרוב תוכל לחפש כאן אנשים, קבוצות ופוסטים בקהילה.",
  },
  reportSent: "הדיווח התקבל ויטופל בהקדם",
} as const;
