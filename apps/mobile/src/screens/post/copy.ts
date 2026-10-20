/**
 * Hebrew copy owned by the single-post screen (ADR 0007). Strings that already
 * exist in @safeplace/ui (sheets, report categories, strips, the uploader
 * notice, "load more") stay there; this file holds only what the screen adds.
 * Hebrew masculine generic. Items marked NOT-IN-LAB are not drawn in the lab and
 * need Eli's OK before they ship.
 */
export const postCopy = {
  /** Loading skeleton accessibility label. */
  loadingA11y: "טוען את הפוסט",
  /** NOT-IN-LAB: the detail screen's error / unavailable / empty-comments states reuse the lab's empty-state anatomy. */
  error: {
    title: "לא הצלחנו לטעון את הפוסט",
    message: "ייתכן שאין חיבור לאינטרנט כרגע. נסה שוב בעוד רגע.",
    action: "נסה שוב",
  },
  unavailable: {
    title: "הפוסט אינו זמין עבורך",
    message: "ייתכן שהפוסט הוסר או שאינו משותף איתך.",
    action: "חזרה",
  },
  noComments: "אין עדיין תגובות. אפשר להיות הראשון.",
  commentsError: "לא הצלחנו לטעון את התגובות.",
  commentsRetry: "נסה שוב",
  /** NOT-IN-LAB: feedback toasts for actions the lab draws no confirmation for. */
  toast: {
    linkCopied: "הקישור הועתק",
    shared: "הפוסט שותף לקבוצה",
    appealSent: "הערעור התקבל ויטופל בהקדם",
    failed: "הפעולה לא הושלמה. נסה שוב.",
  },
  /** NOT-IN-LAB: report subtitle for a comment (the lab shows the post wording). */
  reportCommentSubtitle: "מה הבעיה בתגובה? הדיווח יועבר לבדיקה של צוות Safe·Place.",
  /** NOT-IN-LAB: the share-to-group target list (the lab shows only the first sheet). */
  shareTargets: { title: "בחירת קבוצה" },
  /** a11y only. */
  removeAttachmentA11y: "הסרת התמונה",
} as const;
