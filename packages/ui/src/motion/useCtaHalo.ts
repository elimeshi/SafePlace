import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, motion } from "@safeplace/design-tokens";
import { useReducedMotion } from "./reduced-motion";

/**
 * The very slow "breathing" halo on a primary CTA (§6.3.2, ~3.5s cycle) — a
 * soft cyan glow that swells and fades to signal the button is live.
 * Apply the returned style to the CTA's Animated wrapper. Disabled under
 * reduced motion or when `enabled` is false.
 */
export function useCtaHalo(enabled = true) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!enabled || reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {
        duration: motion.ctaHaloDurationMs / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [enabled, reducedMotion, pulse]);

  return useAnimatedStyle(() => ({
    shadowColor: colors.cyan500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: pulse.value * 0.14,
    shadowRadius: 2 + pulse.value * 6,
    elevation: pulse.value * 4,
  }));
}
