import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for Checkbox — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/forms/Checkbox.jsx. This is the single
 * terms-of-service consent control on onboarding step 2 (spec §6.2.2).
 */

const BOX_SIZE = 22;

export interface ResolveCheckboxStyleArgs {
  checked: boolean;
}

export function resolveCheckboxStyle({
  checked,
}: ResolveCheckboxStyleArgs): { box: ViewStyle } {
  return {
    box: {
      width: BOX_SIZE,
      height: BOX_SIZE,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.sm,
      borderWidth: 1.5,
      borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
      backgroundColor: checked ? theme.colors.primary : theme.colors.white,
    },
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
  gap: theme.spacing.md,
};

/** Label text beside the box — caller-provided content, may contain links. */
export const checkboxLabelStyle: TextStyle = {
  ...theme.typeRole.meta,
  color: theme.colors.textSecondary,
  flexShrink: 1,
};
