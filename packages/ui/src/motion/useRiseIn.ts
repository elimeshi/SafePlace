import { useEffect } from "react";
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@safeplace/design-tokens";
import { staggerDelayForIndex } from "./stagger";

const [C0, C1, C2, C3] = motion.easing.standard;

/**
 * The product's signature entrance: fade (opacity 0→1) and rise (translateY
 * 8→0) with a soft ease-out, staggered per element by `index` (§6.3.2). Apply
 * the returned style to an `Animated.View`. Under reduced motion it snaps
 * straight to the visible state — no transform, no fade.
 */
export function useRiseIn(index = 0) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      staggerDelayForIndex(index),
      withTiming(1, {
        duration: motion.durationMs.base,
        easing: Easing.bezier(C0, C1, C2, C3),
      })
    );
  }, [index, reducedMotion, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * motion.entranceTranslateY }],
  }));
}
