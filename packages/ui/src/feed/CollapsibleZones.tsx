import { type ReactNode, useEffect, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { COLLAPSE_EASING, collapseTimings } from "../motion/collapse";

export interface CollapsibleZonesProps {
  /** true → zones height→0 + fade, strip fades in from −8px. */
  collapsed: boolean;
  /** The strip shown while collapsed (<CollapsedStrip>). */
  strip?: ReactNode;
  /** The top zones (app bar, statuses rail, spaces rail). */
  children: ReactNode;
}

const ease = Easing.bezier(...COLLAPSE_EASING);

/**
 * The feed's four-zone collapse (01 §6): lab `.mzones` + `.mstrip`. Reduced
 * motion = opacity only (the height jumps, nothing slides).
 */
export function CollapsibleZones({ collapsed, strip, children }: CollapsibleZonesProps) {
  const reduced = useReducedMotion();
  const t = collapseTimings(reduced);
  const [natural, setNatural] = useState<number | null>(null);
  const height = useSharedValue(0);
  const zonesOpacity = useSharedValue(collapsed ? 0 : 1);
  const stripProgress = useSharedValue(collapsed ? 1 : 0);

  useEffect(() => {
    if (natural == null) return;
    const to = collapsed ? 0 : natural;
    height.value = t.animateHeight ? withTiming(to, { duration: t.heightMs, easing: ease }) : to;
    zonesOpacity.value = withTiming(collapsed ? 0 : 1, { duration: t.zonesFadeMs, easing: ease });
    stripProgress.value = withTiming(collapsed ? 1 : 0, { duration: t.stripMs, easing: ease });
  }, [collapsed, natural, t.animateHeight, t.heightMs, t.zonesFadeMs, t.stripMs, height, zonesOpacity, stripProgress]);

  const zonesStyle = useAnimatedStyle(() => (natural == null ? { opacity: zonesOpacity.value } : { height: height.value, opacity: zonesOpacity.value }));
  const stripStyle = useAnimatedStyle(() => ({
    opacity: stripProgress.value,
    transform: [{ translateY: (1 - stripProgress.value) * t.stripOffsetY }],
    height: stripProgress.value === 0 ? 0 : undefined,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (natural == null && h > 0) {
      height.value = collapsed ? 0 : h;
      setNatural(h);
    }
  };

  return (
    <View>
      {strip ? (
        <Animated.View style={[{ overflow: "visible" }, stripStyle]} pointerEvents={collapsed ? "auto" : "none"}>
          {strip}
        </Animated.View>
      ) : null}
      <Animated.View style={[{ overflow: "hidden" }, zonesStyle]} pointerEvents={collapsed ? "none" : "auto"}>
        <View onLayout={onLayout} style={{ flexShrink: 0 }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
