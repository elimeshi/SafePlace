import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { theme } from "@/lib/theme";

const HERO_SIZE = 186;
const HALO_SIZE = 220;

/**
 * The 3D Saturn hero of the welcome screen (design-lab FINAL-SPEC.md). A gentle
 * "flow" — a slow vertical bob with a slight rotate (lab @keyframes flow, 7s
 * full cycle) — over a soft pulsing cyan halo (lab .halo radial glow, 6s full
 * cycle). withRepeat(..., -1, true) reverses each tween, so the 3500ms / 3000ms
 * half-cycle durations below round-trip to those 7s / 6s loops. Both gate on
 * reduced motion: with it on, the hero sits still and the halo holds steady
 * (master spec §6.3.4 / CLAUDE.md §7.5).
 */
export function SaturnHero() {
  const reducedMotion = useReducedMotion();
  const flow = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      flow.value = 0;
      pulse.value = 0;
      return;
    }
    flow.value = withRepeat(
      withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reducedMotion, flow, pulse]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(flow.value, [0, 1], [0, -11]) },
      { rotate: `${interpolate(flow.value, [0, 1], [0, 2])}deg` },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 0.85]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.07]) }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.halo, haloStyle]}>
        <Svg width={HALO_SIZE} height={HALO_SIZE}>
          <Defs>
            <RadialGradient id="saturnHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.34} />
              <Stop offset="62%" stopColor={theme.colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={HALO_SIZE / 2} cy={HALO_SIZE / 2} r={HALO_SIZE / 2} fill="url(#saturnHalo)" />
        </Svg>
      </Animated.View>
      <Animated.Image
        source={require("../../../assets/saturn3d.png")}
        style={[styles.hero, heroStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 168,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    width: HERO_SIZE,
    height: HERO_SIZE,
  },
});
