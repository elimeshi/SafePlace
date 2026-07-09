/**
 * Safe-Place color tokens — finalized from the locked design system
 * (design-reference/tokens/colors.css). Deep, soft blue primary; one warm
 * terracotta accent used sparingly (primary CTA only); generous white and
 * quiet greys. Restrained, modest, calm — "visual codes that don't shout".
 */

export const colors = {
  // Primary ramp (deep, soft blue) — master spec §6.3.5.
  blue900: "#10263C",
  blue800: "#1B3B5C",
  blue700: "#234B73",
  blue600: "#2C5985",
  blue500: "#3F6D99",
  blue400: "#5C82A8",
  blue300: "#8AA6C2",
  blue200: "#C2D2E1",
  blue100: "#E3EBF2",
  blue050: "#F2F6FA",

  // Warm accent — reserved for the single primary CTA of a screen.
  terracotta700: "#A35F36",
  terracotta600: "#B96E42",
  terracotta500: "#C97D4F",
  terracotta400: "#D79A74",
  terracotta100: "#F6E7DC",

  // Ink / neutrals.
  ink900: "#1A1D21",
  ink700: "#3C4149",
  ink500: "#6B7280",
  ink400: "#9AA1AC",
  ink300: "#C3C8D0",
  ink200: "#E5E7EB",
  ink100: "#EEF0F3",
  ink050: "#F7F8FA",
  white: "#FFFFFF",

  // Semantic status + soft tints (danger zone / notices).
  success: "#2F855A",
  successSoft: "#EAF5EF",
  warning: "#B7791F",
  warningSoft: "#FBF3E2",
  danger: "#C53030",
  dangerSoft: "#FBEAEA",

  // Feed source-label semantics (01-feed-spec §2.3.5).
  suggestedLabel: "#F59E0B", // "מוצע עבורך" — warm amber
  neutralLabel: "#94A3B8", // "פוסט ציבורי" — slate blue-grey

  // Flat semantic aliases (kept so existing consumers keep working).
  primary: "#2C5985",
  primaryLight: "#5C82A8",
  primaryDark: "#1B3B5C",
  accent: "#C97D4F",
  background: "#FFFFFF",
  backgroundMuted: "#F7F8FA",
  textPrimary: "#1A1D21",
  textSecondary: "#6B7280",
  textOnPrimary: "#FFFFFF",
  border: "#E5E7EB",
  borderStrong: "#C3C8D0",
} as const;

/**
 * Group color palette — the 12 locked, muted colors admins pick from per
 * group (01-feed-spec §2.2.4). Pre-defined, never free choice; used at a
 * soft ~16% tint on source labels, never full saturation.
 */
export const groupPalette = [
  "#2C5985", // blue (matches primary)
  "#5B8C5A", // sage
  "#C97D4F", // terracotta (matches accent)
  "#7C6A9C", // plum
  "#B08968", // tan
  "#4A7C7C", // teal
  "#A85751", // brick
  "#6B7A8F", // slate
  "#8C7355", // olive
  "#5A6B8C", // indigo
  "#9C7A6A", // clay
  "#557A6B", // forest
] as const;
