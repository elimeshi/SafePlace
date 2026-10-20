import { useEffect, useState } from "react";
import { type DimensionValue, type LayoutChangeEvent, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { GradientFill } from "../foundation/GradientFill";
import { feedColors } from "@safeplace/design-tokens";
import { SHIMMER_GRADIENT, SHIMMER_MS, shimmerTranslate, skeletonCardStyle } from "./Skeleton.styles";

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  flex?: boolean;
}

/** A shimmering placeholder block (lab `.sk`). Static under reduced motion. */
export function Skeleton({ width = "100%", height, radius = 8, flex }: SkeletonProps) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduced || w === 0) {
      cancelAnimation(x);
      x.value = 0;
      return;
    }
    const { from, to } = shimmerTranslate(w);
    x.value = from;
    x.value = withRepeat(withTiming(to, { duration: SHIMMER_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [reduced, w, x]);

  const ground = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));

  return (
    <View
      onLayout={onLayout}
      style={{ width, height, borderRadius: radius, overflow: "hidden", backgroundColor: feedColors.skeletonA, flex: flex ? 1 : undefined }}
      testID="skeleton"
    >
      {w > 0 ? (
        <Animated.View style={[{ width: w * 2, height }, ground]}>
          <GradientFill gradient={SHIMMER_GRADIENT} width={w * 2} height={height} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Lab `.skc`: the loading placeholder of a feed card. */
export function SkeletonPostCard({ media = false }: { media?: boolean }) {
  return (
    <View style={skeletonCardStyle} testID="skeleton-post-card">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <Skeleton width={42} height={42} radius={21} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton width="46%" height={12} />
          <Skeleton width="28%" height={16} radius={999} />
        </View>
      </View>
      <Skeleton width="92%" height={12} />
      <Skeleton width="70%" height={12} />
      {media ? <Skeleton height={170} radius={14} /> : null}
    </View>
  );
}
