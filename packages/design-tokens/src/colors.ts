/**
 * Safe-Place color tokens — "Indigo Nights" (Classic indigo + cyan), locked in
 * the onboarding design lab (design-lab/FINAL-SPEC.md). Deep indigo primary,
 * one bright cyan accent, indigo-tinted neutrals, generous near-white ground.
 * Replaces the earlier blue+terracotta Phase-1 palette globally.
 */

export const colors = {
  // Primary ramp (deep indigo) — design-lab "Indigo Nights".
  blue900: "#101A3A",
  blue800: "#1B2352", // primaryDark — full-bleed gradient bottom
  blue700: "#232C6E",
  blue600: "#2E3A8C", // primary
  blue500: "#4451A6",
  blue400: "#6B77C2",
  blue300: "#9AA4D8",
  blue200: "#C4CBEC",
  blue100: "#E5E8F7",
  blue050: "#F3F5FC", // app ground / gradient base

  // Cyan accent ramp — the single bright accent (brand middot, halo, checks).
  cyan700: "#157C8A",
  cyan600: "#1AA6B8",
  cyan500: "#22C3D6", // accent
  cyan400: "#5AD5E3",
  cyan100: "#DBF4F8",

  // Ink / neutrals (indigo-tinted).
  ink900: "#1A2140",
  ink700: "#2E3760",
  ink500: "#5A6488",
  ink400: "#8A93B5",
  ink300: "#B9C0DB",
  ink200: "#DCE1F2",
  ink100: "#E9ECF7",
  ink050: "#F3F5FC",
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
  primary: "#2E3A8C",
  primaryLight: "#4451A6",
  primaryDark: "#1B2352",
  accent: "#22C3D6",
  background: "#F3F5FC",
  backgroundMuted: "#E9ECF7",
  surface: "#FFFFFF",
  textPrimary: "#1A2140",
  textSecondary: "#5A6488",
  textOnPrimary: "#FFFFFF",
  border: "#DCE1F2",
  borderStrong: "#B9C0DB",

  // Welcome "Dual" gradient bottom (decoupled from primaryDark — cobalt).
  cobalt: "#0C3A78",
} as const;

/**
 * Group color palette — the 12 locked, muted colors admins pick from per
 * group (01-feed-spec §2.2.4). Pre-defined, never free choice; used at a
 * soft ~16% tint on source labels, never full saturation.
 */
export const groupPalette = [
  "#2E3A8C", // indigo (matches primary)
  "#5B8C5A", // sage
  "#22C3D6", // cyan (matches accent)
  "#7C6A9C", // plum
  "#B08968", // tan
  "#4A7C7C", // teal
  "#A85751", // brick
  "#6B7A8F", // slate
  "#8C7355", // olive
  "#5A6B8C", // indigo-grey
  "#9C7A6A", // clay
  "#557A6B", // forest
] as const;
