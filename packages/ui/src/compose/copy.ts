/**
 * Hebrew default copy for the compose / single-post chrome (ADR 0007:
 * prop-overridable). Source: feed-lab `compose`, `composeGroup`, `post`.
 */
export const composeCopy = {
  newPost: "פוסט חדש",
  groupPost: "פוסט בקבוצה",
  publish: "פרסם",
  placeholder: "מה תרצה לשתף?",
  groupPlaceholder: "כתוב לקבוצה…",
  checkingMedia: "בודקים את המדיה…",
  media: "מדיה",
  location: "מיקום",
  postTitle: "פוסט",
  /** a11y only (not drawn in the lab). */
  closeA11y: "סגירה",
  backA11y: "חזרה",
  removeA11y: "הסרה",
} as const;

export type ComposeCopy = typeof composeCopy;
