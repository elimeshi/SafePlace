/**
 * The exact, spec-mandated copy shown to an uploader about their own media.
 *
 * Lives in a shared package rather than in services/moderation-pipeline
 * because the app has to render it, and the app must not depend on a server
 * service (that would pull a vision-model SDK into the mobile bundle). The
 * service re-exports from here, so there is still exactly one definition of
 * each string — never duplicate or reword these in a screen.
 *
 * Sourced verbatim from docs/product/00-master-spec.md §3.5 and §4.4.2,
 * cross-referenced in docs/architecture/moderation-pipeline.md §3.
 */

/**
 * Shown to a male uploader when their media is classified as containing women.
 * A confirm/cancel choice, never a post-hoc rejection notice, and never
 * rephrased into a judgment: the upload is not blocked and never was (master
 * spec §3.5). The wording states a consequence — many viewers have chosen this
 * filter — rather than a verdict on the content or the person.
 */
export const WOMEN_DETECTED_NOTICE_HE = {
  title:
    "זוהו נשים במדיה שהעלית. עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי.",
  confirmLabel: "אישור",
  cancelLabel: "חזרה",
  /** §2.3: the uploader may dispute an AI classification from the notice itself. */
  appealLabel: "ערער",
} as const;

/** Shown while medium-confidence media is frozen for human review (§2.2). */
export const PENDING_REVIEW_NOTICE_HE = {
  title: "התוכן שלך בבדיקה ויפורסם בקרוב.",
} as const;

/**
 * Shown while classification is still in flight. The media is withheld from
 * other viewers during this window (migration 0007), so the uploader is told
 * it is on its way rather than left looking at an unexplained placeholder.
 */
export const PROCESSING_NOTICE_HE = {
  title: "המדיה בעיבוד ותוצג בקרוב.",
} as const;
