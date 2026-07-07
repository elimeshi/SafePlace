/**
 * ⚠️ PLACEHOLDER VALUES — pending the Claude Design visual lock-in session.
 * See docs/decisions/0003-first-push-scope.md and docs/design/README.md.
 *
 * These are directly transcribed starting points from
 * docs/product/00-master-spec.md §6.3.5 ("a deep, soft blue as primary,
 * generous white, one warm accent used sparingly") — not final design
 * decisions. Do not treat hex values here as approved brand colors.
 */

export const colors = {
  // Primary: "deep, soft blue" per master spec §6.3.5.
  primary: "#2C5985",
  primaryLight: "#5C82A8",
  primaryDark: "#1B3B5C",

  // Warm accent, used sparingly (primary CTA button only) per spec.
  accent: "#C97D4F",

  // Backgrounds — "generous whitespace" is the guiding principle.
  background: "#FFFFFF",
  backgroundMuted: "#F7F8FA",

  // Text
  textPrimary: "#1A1D21",
  textSecondary: "#6B7280",
  textOnPrimary: "#FFFFFF",

  // Borders / dividers — "subtle frame" per feed card spec.
  border: "#E5E7EB",

  // Semantic
  success: "#2F855A",
  warning: "#B7791F", // used for the Settings "dangerous zone" per §3.6
  danger: "#C53030",

  // Suggested-post label per docs/product/01-feed-spec.md §2.3.5
  suggestedLabel: "#F59E0B",

  // Neutral source label (public post, no group)
  neutralLabel: "#94A3B8",
} as const;

/**
 * Group color palette — 12–16 balanced colors per
 * docs/product/01-feed-spec.md §2.2.4. PLACEHOLDER SET — final palette to
 * be locked with a designer.
 */
export const groupPalette = [
  "#2C5985", // blue (matches primary)
  "#5B8C5A", // sage green
  "#C97D4F", // warm terracotta (matches accent)
  "#7C6A9C", // muted plum
  "#B08968", // warm tan
  "#4A7C7C", // teal
  "#A85751", // brick
  "#6B7A8F", // slate blue-grey
  "#8C7355", // olive brown
  "#5A6B8C", // dusty indigo
  "#9C7A6A", // clay
  "#557A6B", // forest teal
] as const;
