/**
 * Hebrew default copy for the content pieces (ADR 0007). Components take each
 * string as a prop and fall back to these, so an i18n layer can substitute
 * translations later. Hebrew masculine generic throughout; never gendered by
 * the user's declared gender (phase-4 plan §1). Source: feed-lab.html.
 */
export const contentCopy = {
  filteredLabel: "מדיה מסוננת לפי ההעדפות שלך",
  filteredHint: "ניתן לשנות את העדפות הצריכה באזור האישי בכל עת.",
  groupFallbackName: "קבוצה",
  publicLabel: "פוסט ציבורי",
  followersLabel: "לעוקבים",
  suggestedLabel: "מוצע עבורך",
  sharedBy: "שיתף פוסט",
  quoteUnavailable: "הפוסט המקורי אינו זמין עבורך.",
  likeA11y: "לייק",
  commentA11y: "תגובה",
  shareA11y: "שיתוף",
  saveA11y: "שמירה",
  shareLabel: "שיתוף",
  moreA11y: "עוד אפשרויות",
  processingStrip: "המדיה בעיבוד ותוצג בקרוב.",
  reviewStrip: "התוכן שלך בבדיקה ויפורסם בקרוב.",
  /** Shared-types women-detected notice, verbatim (07-moderation / master §4.4.2). */
  womenDetectedNotice:
    "זוהו נשים במדיה שהעלית. עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי.",
  noticeConfirm: "אישור",
  noticeBack: "חזרה",
  noticeAppeal: "ערער",
  noticeUnderstood: "הבנתי",
  noticeRemoveMedia: "הסרת המדיה",
} as const;

export type ContentCopy = typeof contentCopy;
