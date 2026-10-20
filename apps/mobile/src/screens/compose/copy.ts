/**
 * Compose screen copy (ADR 0007). Strings the lab draws live in @safeplace/ui
 * (composeCopy / exposureCopy / contentCopy); this file holds only what the
 * screen itself says. Entries tagged "derived" are NOT in the lab and are
 * flagged for Eli. Hebrew masculine generic, never gendered by the user.
 */
export const screenCopy = {
  /** derived: Family Space compose (02 §2.2 names only groups; the lab draws only the group case). */
  familyPlaceholder: "כתוב למרחב…",
  familyLockedHelp: "פוסט שנכתב במרחב נשאר במרחב.",
  /** derived: the place-name entry opened by the "location" button (02 §3.5: a name, never coordinates). */
  locationLabel: "שם המקום",
  locationPlaceholder: "עיר, שכונה או מוסד",
  locationAdd: "הוספה",
  /** derived: states and errors (the lab draws none of them). */
  loadError: {
    title: "לא הצלחנו לפתוח את יצירת הפוסט",
    message: "ייתכן שאין חיבור לאינטרנט כרגע. נסה שוב בעוד רגע.",
    action: "נסה שוב",
  },
  uploadError: "העלאת המדיה נכשלה. נסה שוב.",
  publishError: "הפרסום נכשל. הפוסט נשמר כאן ואפשר לנסות שוב.",
  actionError: "הפעולה נכשלה. נסה שוב.",
  /** derived: shown when the author appeals; the appeal is queued for a human (07 §2.3). */
  appealSent: "הערעור התקבל ויטופל בהקדם",
} as const;
