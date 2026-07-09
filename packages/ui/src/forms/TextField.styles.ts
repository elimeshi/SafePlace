import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for TextField — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/forms/TextField.jsx: a floating-label input
 * (spec §6.3.2). Resting: a thin neutral border. Focused: a slightly
 * thicker primary border — the soft blue focus ring drawn *around* it is a
 * separate outer wrapper View in TextField.tsx (RN has no `box-shadow`
 * spread to fake it with a single style object). The label floats up and
 * shrinks once the field is focused or already carries a value.
 */

/** Matches the resting field height in the web reference. */
export const FIELD_MIN_HEIGHT = 56;

/** Vertically centers the resting (non-floated) label inside the field. */
const LABEL_RESTING_TOP = 18;

export interface ResolveFieldStyleArgs {
  focused: boolean;
  valid: boolean;
  hasValue: boolean;
}

export interface FieldStyle {
  wrapper: ViewStyle;
  input: TextStyle;
  label: TextStyle;
  showCheck: boolean;
}

export function resolveFieldStyle({
  focused,
  valid,
  hasValue,
}: ResolveFieldStyleArgs): FieldStyle {
  const floated = focused || hasValue;

  return {
    wrapper: {
      position: "relative",
      minHeight: FIELD_MIN_HEIGHT,
      justifyContent: "center",
      borderWidth: focused ? 1.5 : 1,
      borderColor: focused ? theme.colors.primary : theme.colors.border,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.white,
      paddingStart: theme.spacing.md,
      paddingEnd: theme.spacing.md,
    },
    input: {
      alignSelf: "stretch",
      paddingTop: floated ? theme.spacing.xl : theme.spacing.lg,
      paddingBottom: floated ? theme.spacing.sm : theme.spacing.lg,
      fontFamily: theme.fontFamily.base,
      fontSize: theme.fontSize.base,
      color: theme.colors.textPrimary,
    },
    label: {
      position: "absolute",
      start: theme.spacing.md,
      top: floated ? theme.spacing.sm : LABEL_RESTING_TOP,
      fontFamily: floated ? theme.fontFamily.medium : theme.fontFamily.base,
      fontSize: floated ? theme.fontSize.xs : theme.fontSize.base,
      color: focused ? theme.colors.primary : theme.colors.textSecondary,
    },
    showCheck: valid,
  };
}
