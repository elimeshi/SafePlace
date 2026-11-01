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
  /** Shared-types CONTENT_NOTICE_HE.title, verbatim. Accepted by Eli 2026-11-01 (open-questions-backlog.md §K). */
  contentNotice:
    "זוהה במדיה שהעלית תוכן שמשתמשים רבים ברשת בחרו שלא לראות. עליך לדעת שבעקבות זאת חלק מהמשתמשים לא יוכלו לראות את המדיה בפוסט הנוכחי.",
  /** Shared-types CONTENT_NOTICE_HE.detailsLabel, verbatim. */
  noticeDetails: "מה זוהה?",
  noticeConfirm: "אישור",
  noticeBack: "חזרה",
  noticeAppeal: "ערער",
  noticeUnderstood: "הבנתי",
  noticeRemoveMedia: "הסרת המדיה",
} as const;

export type ContentCopy = typeof contentCopy;
