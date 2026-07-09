import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for SourceLabel — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/content/SourceLabel.jsx. The small colored
 * feed-source pill shown on every post (feed-spec §2.3.4–2.3.5, §4.2):
 *   - group      → the group's own color, soft-tinted, with its icon
 *   - public     → neutral slate-blue-grey, no icon
 *   - suggested  → warm amber, no icon
 * Background is always a SOFT ~16% tint of the foreground color — never full
 * saturation (see invariant on restrained, non-shouty visual codes).
 */

export type SourceLabelKind = "group" | "public" | "suggested";

/**
 * ~16% opacity tint, expressed as an 8-digit-hex alpha suffix appended to a
 * 6-digit hex color (RN has no `color-mix()`; all theme colors are 6-digit
 * hex, so this is a safe string append).
 */
const TINT_ALPHA_16 = "29";

function softTint(hexColor: string): string {
  return `${hexColor}${TINT_ALPHA_16}`;
}

export interface ResolveSourceLabelStyleArgs {
  kind: SourceLabelKind;
  /** Group color from the group palette (kind="group" only). */
  color?: string;
}

export interface SourceLabelStyle {
  container: ViewStyle;
  label: TextStyle;
  iconColor: string;
}

export function resolveSourceLabelStyle({
  kind,
  color,
}: ResolveSourceLabelStyleArgs): SourceLabelStyle {
  const fg =
    kind === "group"
      ? (color ?? theme.colors.primary)
      : kind === "suggested"
        ? theme.colors.suggestedLabel
        : theme.colors.neutralLabel;

  return {
    container: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: theme.spacing.xs,
      minHeight: 22,
      paddingStart: theme.spacing.sm,
      paddingEnd: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: softTint(fg),
    },
    label: {
      ...theme.typeRole.label,
      color: fg,
      letterSpacing: theme.tracking.label,
    },
    iconColor: fg,
  };
}
