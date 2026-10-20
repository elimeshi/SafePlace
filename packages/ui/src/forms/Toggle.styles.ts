import type { ViewStyle } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { theme } from "../theme";

/**
 * Pure styling for Toggle — the switch used in Settings (interactive) and the
 * onboarding step-3 defaults preview (readOnly). Two tones:
 *  - default: deep-indigo `primary` track + white knob when on, quiet `ink300`
 *    track when off.
 *  - onGlass: as it sits on the full-bleed onboarding glass card (design-lab
 *    `.glass .tg`) — translucent-white track off, solid white track on, with
 *    a white knob off / indigo knob on.
 *
 * RTL: knob offset is expressed flow-relative via `start`. Per the lab
 * (`.tg.on::after{inset-inline-start:22}`) the knob sits near the start edge
 * when OFF and slides toward the end edge when ON.
 */

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 27;
const KNOB_SIZE = 21;
const KNOB_INSET = 3;

/** The knob's `start` offset in each state — single source of truth shared
 * with the view's slide animation. Matches lab: off = 3, on = 22. */
export const TOGGLE_KNOB_START = {
  on: TRACK_WIDTH - KNOB_SIZE - KNOB_INSET, // 22
  off: KNOB_INSET, // 3
} as const;

export interface ResolveToggleStyleArgs {
  on: boolean;
  disabled: boolean;
  /** Render for the full-bleed onboarding glass card. */
  onGlass?: boolean;
  /** Feed-lab `.tg` (bottom sheets): quieter `border` track when off, soft knob shadow. */
  sheet?: boolean;
}

export function resolveToggleStyle({
  on,
  disabled,
  onGlass = false,
  sheet = false,
}: ResolveToggleStyleArgs): { track: ViewStyle; knob: ViewStyle } {
  const trackBg = onGlass
    ? on
      ? "#FFFFFF"
      : "rgba(255,255,255,0.3)"
    : on
      ? theme.colors.primary
      : sheet
        ? theme.colors.border
        : theme.colors.ink300;
  const knobBg = onGlass ? (on ? theme.colors.primary : "#FFFFFF") : theme.colors.white;
  return {
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: theme.radius.full,
      backgroundColor: trackBg,
      opacity: disabled ? 0.5 : 1,
    },
    knob: {
      position: "absolute",
      top: KNOB_INSET,
      start: on ? TOGGLE_KNOB_START.on : TOGGLE_KNOB_START.off,
      width: KNOB_SIZE,
      height: KNOB_SIZE,
      borderRadius: theme.radius.full,
      backgroundColor: knobBg,
      ...(sheet ? { boxShadow: shadows.knob } : theme.elevation.sm),
    },
  };
}
