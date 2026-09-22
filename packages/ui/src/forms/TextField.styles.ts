import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for TextField — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). A floating-label input (spec
 * §6.3.2). Two tones:
 *  - default: white field, thin neutral border; focused = thicker primary
 *    border + a soft blue focus ring (a separate outer wrapper View in
 *    TextField.tsx — RN has no box-shadow spread).
 *  - onGlass: the field as it sits inside the full-bleed onboarding glass card
 *    (design-lab/FINAL-SPEC.md) — near-opaque white fill, borderless, dark
 *    text; the floated label turns indigo. Matches the lab `.glass .field`.
 * The label floats up and shrinks once the field is focused or already carries
 * a value.
 */

/** Field height — lab `.field input` is 6.2u ≈ 58 (u = 8·1.16). */
export const FIELD_MIN_HEIGHT = 58;

/** Vertically centers the resting (non-floated) label inside the field. */
const LABEL_RESTING_TOP = 18;

export interface ResolveFieldStyleArgs {
  focused: boolean;
  valid: boolean;
  hasValue: boolean;
  onGlass?: boolean;
}

export interface FieldStyle {
  wrapper: ViewStyle;
  input: TextStyle;
  label: TextStyle;
  showCheck: boolean;
  /** Color for the trailing success check — indigo on glass, green otherwise. */
  checkColor: string;
}

export function resolveFieldStyle({
  focused,
  valid,
  hasValue,
  onGlass = false,
}: ResolveFieldStyleArgs): FieldStyle {
  const floated = focused || hasValue;

  if (onGlass) {
    return {
      wrapper: {
        position: "relative",
        minHeight: FIELD_MIN_HEIGHT,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "transparent",
        borderRadius: theme.radius.lg,
        backgroundColor: "rgba(255,255,255,0.92)",
        paddingStart: theme.spacing.md,
        paddingEnd: theme.spacing.md,
      },
      input: {
        alignSelf: "stretch",
        // lab .field input: padding 2.1u top / 1.8u sides / 0.7u bottom.
        paddingTop: floated ? 19.5 : 15,
        paddingBottom: floated ? 6.5 : 15,
        fontFamily: theme.fontFamily.base,
        fontSize: 15.7, // 0.98·fs
        color: "#1C2333",
      },
      label: {
        position: "absolute",
        start: 17.6, // 1.9u
        top: floated ? 13 : LABEL_RESTING_TOP, // filled label top = 1.4u
        fontFamily: floated ? theme.fontFamily.semibold : theme.fontFamily.base,
        fontSize: floated ? 10.24 : 15.7, // filled 0.64·fs, resting 0.98·fs
        color: floated ? theme.colors.primary : "#41506A",
      },
      showCheck: valid,
      checkColor: theme.colors.primary,
    };
  }

  return {
    wrapper: {
      position: "relative",
      minHeight: FIELD_MIN_HEIGHT,
      justifyContent: "center",
      borderWidth: focused ? 1.5 : 1,
      borderColor: focused ? theme.colors.primary : theme.colors.border,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
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
    checkColor: theme.colors.success,
  };
}
