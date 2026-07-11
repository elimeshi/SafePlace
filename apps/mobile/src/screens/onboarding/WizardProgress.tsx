import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { theme } from "@/lib/theme";

const TRACK_HEIGHT = 4;
const [c0, c1, c2, c3] = theme.motion.easing.standard;

/**
 * Slim top progress bar for the 3-step wizard (master spec §6.2 / §6.3.2 —
 * "פס התקדמות עליון מתעדכן"). The fill grows from the start edge; because it's
 * a normal child with a width percentage inside a row-neutral track, RTL is
 * automatic — in Hebrew it fills from the right. The width eases on step
 * change and snaps instantly under reduced motion (§6.3.4).
 */
export function WizardProgress({ current, total = 3 }: { current: number; total?: number }) {
  const reducedMotion = useReducedMotion();
  const target = Math.max(0, Math.min(1, current / total));
  const progress = useSharedValue(target);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = target;
      return;
    }
    progress.value = withTiming(target, {
      duration: theme.motion.durationMs.base,
      easing: Easing.bezier(c0, c1, c2, c3),
    });
  }, [target, reducedMotion, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
      style={{
        height: TRACK_HEIGHT,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.ink100,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          fill,
          { height: "100%", borderRadius: theme.radius.full, backgroundColor: theme.colors.primary },
        ]}
      />
    </View>
  );
}
