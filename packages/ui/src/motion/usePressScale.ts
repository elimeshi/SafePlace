import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@safeplace/design-tokens";
import { useReducedMotion } from "./reduced-motion";

/**
 * Press feedback — a subtle inward scale(0.97) and back (§6.3.2). Spread the
 * returned onPressIn/onPressOut onto a Pressable and apply `animatedStyle` to
 * its Animated wrapper. No-op under reduced motion.
 */
export function usePressScale() {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const onPressIn = () => {
    if (!reducedMotion) {
      scale.value = withTiming(motion.pressScale, { duration: motion.durationMs.fast });
    }
  };

  const onPressOut = () => {
    if (!reducedMotion) {
      scale.value = withTiming(1, { duration: motion.durationMs.fast });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}
