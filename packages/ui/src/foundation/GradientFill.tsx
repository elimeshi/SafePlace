import { type ReactNode, useId, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { CssGradient } from "@safeplace/design-tokens";
import { cssGradientVector } from "./gradient";

export interface GradientFillProps {
  gradient: CssGradient;
  /** Known box size (skips waiting for layout); otherwise measured. */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * A CSS-angle linear gradient behind its children, drawn with
 * react-native-svg (already a peer dependency — no gradient package added).
 * Gradients are absolute and never mirrored by RTL (same rule as
 * design-tokens/gradients).
 */
export function GradientFill({ gradient, width, height, style, children }: GradientFillProps) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [box, setBox] = useState<{ w: number; h: number } | null>(
    width != null && height != null ? { w: width, h: height } : null
  );
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!box || box.w !== w || box.h !== h) setBox({ w, h });
  };
  const v = box ? cssGradientVector(gradient.angle, box.w, box.h) : null;
  return (
    <View onLayout={onLayout} style={[width != null && height != null ? { width, height } : null, style]}>
      {box && v ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
              {gradient.stops.map(([color, offset]) => (
                <Stop key={`${color}-${offset}`} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={box.w} height={box.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
