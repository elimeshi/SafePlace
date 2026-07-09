import { type ReactNode, useState } from "react";
import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useCtaHalo } from "../motion/useCtaHalo";
import { usePressScale } from "../motion/usePressScale";
import {
  resolveButtonStyle,
  type ButtonSize,
  type ButtonVariant,
} from "./Button.styles";

export type { ButtonVariant, ButtonSize } from "./Button.styles";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Idle "breathing" halo — only for the primary CTA of a screen. */
  halo?: boolean;
  /** Stretch to fill the parent's width. */
  block?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Safe-Place Button. Deep-blue `primary` by default; the single warm
 * terracotta `cta` variant is reserved for the most important action on a
 * screen and can carry the breathing `halo`. Press feedback is a subtle
 * scale(0.97); both animations gate on reduced motion. Label text is RTL by
 * default (the app forces RTL globally), so no manual mirroring is needed.
 */
export function Button({
  variant = "primary",
  size = "md",
  halo = false,
  block = false,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const press = usePressScale();
  const haloStyle = useCtaHalo(halo && !disabled);
  const { container, label } = resolveButtonStyle({
    variant,
    size,
    state: pressed ? "pressed" : "rest",
    disabled,
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        press.onPressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        press.onPressOut();
      }}
      style={[
        container,
        block ? { alignSelf: "stretch" } : null,
        haloStyle,
        press.animatedStyle,
      ]}
    >
      <Text style={label}>{children}</Text>
    </AnimatedPressable>
  );
}
