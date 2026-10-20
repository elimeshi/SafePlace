import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { resolveToggleStyle, TOGGLE_KNOB_START } from "./Toggle.styles";
import { theme } from "../theme";

export interface ToggleProps {
  value: boolean;
  onValueChange?: (v: boolean) => void;
  disabled?: boolean;
  /** Display-only mode — renders identically but ignores taps. Used for the
   * onboarding step-3 defaults preview (spec §6.2.3): the user is informed
   * of their defaults, not asked. */
  readOnly?: boolean;
  /** Render for the full-bleed onboarding glass card. */
  onGlass?: boolean;
  /** Render for a bottom sheet row (feed lab `.tg`). */
  sheet?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Safe-Place switch. Deep-blue `primary` track + white knob when on, quiet
 * `ink300` track when off. Interactive in Settings; pass `readOnly` for the
 * onboarding defaults preview. The knob's on/off slide is flow-relative
 * (`start`, never `left`/`right`) so it is RTL-correct by construction, and
 * gates on reduced motion.
 */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  readOnly = false,
  onGlass = false,
  sheet = false,
}: ToggleProps) {
  const reducedMotion = useReducedMotion();
  const { track, knob } = resolveToggleStyle({ on: value, disabled, onGlass, sheet });
  const knobStart = useSharedValue(
    value ? TOGGLE_KNOB_START.on : TOGGLE_KNOB_START.off
  );

  useEffect(() => {
    const target = value ? TOGGLE_KNOB_START.on : TOGGLE_KNOB_START.off;
    knobStart.value = reducedMotion
      ? target
      : withTiming(target, {
          duration: theme.motion.durationMs.base,
          easing: Easing.bezier(...theme.motion.easing.standard),
        });
  }, [value, reducedMotion, knobStart]);

  const knobAnimatedStyle = useAnimatedStyle(() => ({
    start: knobStart.value,
  }));

  const handlePress = () => {
    if (disabled || readOnly) return;
    onValueChange?.(!value);
  };

  return (
    <AnimatedPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled || readOnly}
      onPress={handlePress}
      style={track}
    >
      <Animated.View style={[knob, knobAnimatedStyle]} />
    </AnimatedPressable>
  );
}
