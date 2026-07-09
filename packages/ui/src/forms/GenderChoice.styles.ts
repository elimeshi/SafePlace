import type { TextStyle, ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for GenderChoice — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/forms/GenderChoice.jsx. The two "door" buttons
 * of onboarding step 2 are presented neutrally and fully symmetrically:
 * identical treatment for both genders, differing only by which one is
 * currently selected. Selecting a door thickens its border and fills it —
 * "pressing a door", not "ticking a box".
 */

export interface ResolveDoorStyleArgs {
  selected: boolean;
}

export function resolveDoorStyle({
  selected,
}: ResolveDoorStyleArgs): { container: ViewStyle; label: TextStyle } {
  return {
    container: {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      minHeight: 108,
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      borderWidth: 2,
      borderColor: selected ? theme.colors.primary : theme.colors.border,
      backgroundColor: selected ? theme.colors.blue050 : theme.colors.white,
    },
    label: {
      color: selected ? theme.colors.primary : theme.colors.textPrimary,
      fontFamily: theme.fontFamily.semibold,
      fontSize: theme.fontSize.xl,
      textAlign: "center",
    },
  };
}

/**
 * Layout for the two-door row. `flexDirection: "row"` mirrors automatically
 * under RTL (Safe-Place's global default) — no left/right values needed.
 */
export function resolveGenderChoiceRowStyle(): ViewStyle {
  return {
    flexDirection: "row",
    gap: theme.spacing.md,
  };
}
