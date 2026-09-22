import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for Checkbox — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/forms/Checkbox.jsx. This is the single
 * terms-of-service consent control on onboarding step 2 (spec §6.2.2).
 */

const BOX_SIZE = 22;

/** Light red for the error box border on the dark glass — the default danger
 * (#C53030) is near-invisible there. */
const DANGER_ON_GLASS = "#FF8792";

export interface ResolveCheckboxStyleArgs {
  checked: boolean;
  /** Render for the full-bleed onboarding glass card. */
  onGlass?: boolean;
  /** Flag the box (unchecked required consent submitted). */
  error?: boolean;
}

export function resolveCheckboxStyle({
  checked,
  onGlass = false,
  error = false,
}: ResolveCheckboxStyleArgs): { box: ViewStyle; checkColor: string } {
  if (onGlass) {
    return {
      box: {
        width: BOX_SIZE,
        height: BOX_SIZE,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.sm,
        borderWidth: error && !checked ? 2 : 1.5,
        borderColor: error && !checked ? DANGER_ON_GLASS : checked ? "#FFFFFF" : "rgba(255,255,255,0.5)",
        backgroundColor: checked ? "#FFFFFF" : "rgba(255,255,255,0.28)",
      },
      checkColor: theme.colors.primary,
    };
  }
  return {
    box: {
      width: BOX_SIZE,
      height: BOX_SIZE,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.sm,
      borderWidth: error && !checked ? 2 : 1.5,
      borderColor: error && !checked ? theme.colors.danger : checked ? theme.colors.primary : theme.colors.borderStrong,
      backgroundColor: checked ? theme.colors.primary : theme.colors.white,
    },
    checkColor: theme.colors.white,
  };
}

/**
 * Row wrapping the box + optional label. `flexDirection: "row"` mirrors
 * correctly under the app's global RTL bootstrap (ADR 0007); the gap is
 * flow-relative by construction (no marginStart/End needed for a single
 * gap between two children).
 */
export const checkboxRowStyle: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10, // lab .terms gap 1.1u
};

/** Label text beside the box — caller-provided content, may contain links. */
export const checkboxLabelStyle: TextStyle = {
  ...theme.typeRole.meta,
  color: theme.colors.textSecondary,
  flexShrink: 1,
  // rn-web: allow the label to shrink below its content width so long consent
  // text wraps inside the row instead of forcing the card past the viewport.
  minWidth: 0,
};
