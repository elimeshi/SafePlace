import { createContext, useContext } from "react";
import { useReducedMotion as useSystemReducedMotion } from "react-native-reanimated";

/**
 * The single reduced-motion hook for this package (invariant: all custom motion
 * gates on it). It is the OS "reduce motion" setting (read once at app start, per
 * Reanimated), OR an explicit app-level override from <MotionPreferenceProvider> —
 * which is how the gallery's "motion off" toggle, and a future in-app setting, reach
 * every component.
 */
export type MotionPreference = "system" | "reduce";

const MotionPreferenceContext = createContext<MotionPreference>("system");

export const MotionPreferenceProvider = MotionPreferenceContext.Provider;

export function useReducedMotion(): boolean {
  const preference = useContext(MotionPreferenceContext);
  const system = useSystemReducedMotion();
  return preference === "reduce" || system;
}
