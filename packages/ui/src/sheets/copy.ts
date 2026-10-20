/**
 * Hebrew default copy for the sheets (ADR 0007: every string is a prop
 * default). Masculine generic. Report copy is verbatim from 07-moderation
 * §3.2–3.4 as the lab shows it. Strings with a name are functions.
 */
export const sheetCopy = {
  plusMenu: {
    title: "יצירה",
    post: "פוסט",
    postHint: "פוסט קבוע בפרופיל שלך",
    status: "סטטוס",
    soon: "בקרוב",
  },
  postMenu: {
    lessLikeThis: "פחות תוכן כזה",
    dontSuggest: (name: string) => `אל תציע לי את ${name}`,
    why: "למה אני רואה את זה?",
    save: "שמירת הפוסט",
    report: "דיווח על הפוסט",
    copyLink: "העתקת קישור",
    mute: (name: string) => `השתקת ${name}`,
    muteHint: "התגובות והפוסטים שלו לא יוצגו לך",
  },
  ownPostMenu: {
    save: "שמירת הפוסט",
    copyLink: "העתקת קישור",
    edit: "עריכת הפוסט",
    soon: "בקרוב",
  },
  why: {
    title: "למה אני רואה את זה?",
    suggested: (name: string) =>
      `זהו פוסט ציבורי של ${name}. אינך עוקב אחריו — מדי פעם אנחנו משלבים בפיד פוסטים ציבוריים, כדי שתוכל להכיר עוד אנשים בקהילה.`,
    followedOnly: "הצג רק תוכן מאנשים וקבוצות שאני עוקב אחריהם",
    followedOnlyHint: "אפשר לשנות בכל עת",
  },
  share: {
    title: "שיתוף",
    inApp: "בתוך Safe·Place",
    outside: "מחוץ ל-Safe·Place",
    toGroup: "שיתוף לקבוצה",
    toGroupHint: (group: string) => `רק בתוך ${group} — הקבוצה פרטית`,
    toStatus: "שיתוף לסטטוס",
    toMessage: "שליחה בהודעה פרטית",
    soon: "בקרוב",
    copyLink: "העתקת קישור",
    copyLinkPublicOnly: "ניתן להעתיק קישור רק לפוסטים ציבוריים",
  },
  commentMenu: {
    theirs: (name: string) => `תגובה של ${name}`,
    report: "דיווח על התגובה",
    mute: (name: string) => `השתקת ${name}`,
    muteHint: "התגובות והפוסטים שלו לא יוצגו לך",
    yours: "התגובה שלך",
    edit: "עריכת התגובה",
    delete: "מחיקת התגובה",
    soon: "בקרוב",
  },
  report: {
    title: "דיווח על הפוסט",
    subtitle: "מה הבעיה בפוסט? הדיווח יועבר לבדיקה של צוות Safe·Place.",
    categories: ["תוכן הכולל נשים", "הטרדה / איומים", "תוכן מסוכן", "ספאם / פרסומי", "מידע שגוי", "אחר"],
    details: "פירוט נוסף (לא חובה)",
    submit: "שליחת הדיווח",
  },
} as const;

export type SheetCopy = typeof sheetCopy;
