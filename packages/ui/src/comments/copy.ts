/**
 * Hebrew default copy for comments (ADR 0007: prop-overridable). Source:
 * feed-lab `post`, `reply`. Invisible accessibility labels (marked) are not
 * drawn in the lab.
 */
export const commentCopy = {
  like: "אהבתי",
  reply: "הגב",
  placeholder: "הוסף תגובה…",
  replyingTo: "משיב ל",
  moreComments: "הצג עוד תגובות",
  /** a11y only. */
  sendA11y: "שליחה",
  attachA11y: "הוספת תמונה",
  cancelReplyA11y: "ביטול תגובה",
} as const;

export type CommentCopy = typeof commentCopy;
