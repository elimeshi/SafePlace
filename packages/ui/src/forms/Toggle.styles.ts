import type { ViewStyle } from "react-native";
import { theme } from "../theme";

/**
 * Pure styling for Toggle — the switch used in Settings (interactive) and
 * the onboarding step-3 defaults preview (readOnly). Ported from
 * design-reference/components/forms/Toggle.jsx.
 *
 * RTL: the reference positions the knob with CSS `right` — the *start* edge
 * in a right-to-left document — so "on" slides the knob toward the start
 * edge. We express that with the flow-relative `start` offset instead of
 * `right`/`left` so it keeps mirroring correctly (the app forces RTL
 * globally, but `start` is the correct primitive either way).
 */

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 28;
const KNOB_SIZE = 22;
const KNOB_INSET = 3;

/** The knob's `start` offset in each state — single source of truth shared
 * with the view's slide animation. */
export const TOGGLE_KNOB_START = {
  on: KNOB_INSET,
  off: TRACK_WIDTH - KNOB_SIZE - KNOB_INSET,
} as const;

export interface ResolveToggleStyleArgs {
  on: boolean;
  disabled: boolean;
}

export function resolveToggleStyle({
  on,
  disabled,
}: ResolveToggleStyleArgs): { track: ViewStyle; knob: ViewStyle } {
  return {
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: theme.radius.full,
      backgroundColor: on ? theme.colors.primary : theme.colors.ink300,
      opacity: disabled ? 0.5 : 1,
    },
    knob: {
      position: "absolute",
      top: KNOB_INSET,
      start: on ? TOGGLE_KNOB_START.on : TOGGLE_KNOB_START.off,
      width: KNOB_SIZE,
      height: KNOB_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.white,
      ...theme.elevation.sm,
    },
  };
}
