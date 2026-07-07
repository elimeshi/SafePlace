/**
 * The exact required notice copy shown to a male uploader when their
 * content is classified as containing women — sourced verbatim from
 * docs/product/00-master-spec.md §3.5 and §4.4.2, cross-referenced in
 * docs/architecture/moderation-pipeline.md §3.
 *
 * This is a confirm/cancel choice shown BEFORE publish completes — never a
 * post-hoc rejection notice, and never rephrased to sound like a judgment
 * or a block. Keep this string centralized here rather than duplicated
 * across screens so a future copy change happens in exactly one place.
 */
export const WOMEN_DETECTED_NOTICE_HE = {
  title:
    "זוהו נשים במדיה שהעלית. עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי.",
  confirmLabel: "אישור",
  cancelLabel: "חזרה",
} as const;

/**
 * Notice shown when content is frozen for medium-confidence human review.
 * See docs/product/07-moderation-spec.md §2.2.
 */
export const PENDING_REVIEW_NOTICE_HE = {
  title: "התוכן שלך בבדיקה ויפורסם בקרוב.",
} as const;
