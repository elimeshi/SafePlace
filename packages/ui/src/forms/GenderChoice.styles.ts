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
  /** Render for the full-bleed onboarding glass card (translucent doors). */
  onGlass?: boolean;
}

export function resolveDoorStyle({
  selected,
  onGlass = false,
}: ResolveDoorStyleArgs): { container: ViewStyle; label: TextStyle } {
  const base: ViewStyle = {
    flex: 1,
    minWidth: 0, // rn-web: let the door shrink below its label width
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    minHeight: 65, // lab .door min-height 7u
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
  };

  if (onGlass) {
    return {
      container: {
        ...base,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? "#FFFFFF" : "rgba(255,255,255,0.3)",
        backgroundColor: selected ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.15)",
      },
      label: {
        color: selected ? theme.colors.primary : theme.colors.white,
        fontFamily: theme.fontFamily.display,
        fontSize: 16.3, // lab .door span 1.02·fs
        textAlign: "center",
      },
    };
  }

  return {
    container: {
      ...base,
      borderWidth: selected ? 2 : 1.5,
      borderColor: selected ? theme.colors.primary : theme.colors.border,
      backgroundColor: selected ? theme.colors.blue050 : theme.colors.surface,
    },
    label: {
      color: selected ? theme.colors.primary : theme.colors.textPrimary,
      fontFamily: theme.fontFamily.display,
      fontSize: 16.3, // lab .door span 1.02·fs
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
    gap: 13, // lab .doors gap 1.4u
  };
}
