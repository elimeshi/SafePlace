/**
 * The exact, spec-mandated copy shown to an uploader about their own media.
 *
 * Lives in a shared package rather than in services/moderation-pipeline
 * because the app has to render it, and the app must not depend on a server
 * service (that would pull a vision-model SDK into the mobile bundle). The
 * service re-exports from here, so there is still exactly one definition of
 * each string — never duplicate or reword these in a screen.
 *
 * The review and processing strings are verbatim from
 * docs/product/00-master-spec.md §3.5 and §4.4.2 (cross-referenced in
 * docs/architecture/moderation-pipeline.md §3). The content notice generalises
 * the spec's women notice to every group (docs/architecture/content-categories.md).
 */

import type { ContentGroup } from "@safeplace/visibility-policy";

/**
 * Accepted by Eli 2026-11-01 (open-questions-backlog.md §K). One general card
 * for any group (decision g, 2026-10-30); the details line names what was
 * found. Same shape as the old women notice: a confirm/cancel choice that
 * states a consequence, never a verdict and never a block (master spec §3.5).
 */
export const CONTENT_NOTICE_HE = {
  title:
    "זוהה במדיה שהעלית תוכן שמשתמשים רבים ברשת בחרו שלא לראות. עליך לדעת שבעקבות זאת חלק מהמשתמשים לא יוכלו לראות את המדיה בפוסט הנוכחי.",
  detailsLabel: "מה זוהה?",
  confirmLabel: "אישור",
  cancelLabel: "חזרה",
  /** §2.3: the uploader may dispute an AI classification from the notice itself. */
  appealLabel: "ערער",
} as const;

/**
 * Group names for the details line, in CONTENT_GROUPS order. Accepted by Eli
 * 2026-11-01 (open-questions-backlog.md §K).
 */
export const CONTENT_GROUP_LABELS_HE: Record<ContentGroup, string> = {
  sex: "נשים",
  violence: "אלימות",
  religion: "סמלים דתיים",
  addictions: "התמכרויות",
};

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
