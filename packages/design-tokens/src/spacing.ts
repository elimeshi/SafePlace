/**
 * Spacing scale. "Generous whitespace" ("נדיבות בלבן") is a named design
 * principle in docs/product/00-master-spec.md §5.1.1 and §6.3.5 — err
 * toward the larger end of this scale between sections, not the smaller.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

export const radius = {
  sm: 6, // checkboxes, small chips
  md: 12, // source labels
  lg: 18, // inputs, doors, buttons — "Indigo Nights" base radius
  xl: 24, // glass cards, sheets, onboarding panels
  full: 9999, // avatars, pills, toggles
} as const;
