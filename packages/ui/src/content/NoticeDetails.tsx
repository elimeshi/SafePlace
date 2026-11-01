import { useEffect, useState } from "react";
import { Pressable, Text, View, type StyleProp, type TextStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "@safeplace/design-tokens";
import { useDirection } from "../foundation/direction";
import { useReducedMotion } from "../motion/reduced-motion";
import { Icon } from "./Icon";
import { detailsChevronName, detailsMotion, resolveNoticeDetailsStyle } from "./NoticeDetails.styles";

export interface NoticeDetailsProps {
  /** The tappable line ("what was found?"). */
  label: string;
  /** Revealed on tap: the found group names, already joined. */
  details: string;
  /** The host notice's text style, so the revealed line reads as part of it. */
  textStyle?: StyleProp<TextStyle>;
}

const ease = Easing.bezier(...motion.easing.standard);

/** Disclosure line inside the uploader notice. The body's height tweens open/closed; reduced motion jumps. */
export function NoticeDetails({ label, details, textStyle }: NoticeDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const [natural, setNatural] = useState(0);
  const direction = useDirection();
  const m = detailsMotion(useReducedMotion());
  const s = resolveNoticeDetailsStyle();
  const height = useSharedValue(0);
  useEffect(() => {
    const to = expanded ? natural : 0;
    height.value = m.animateHeight ? withTiming(to, { duration: m.ms, easing: ease }) : to;
  }, [expanded, natural, m.animateHeight, m.ms, height]);
  const bodyStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    // Stretch: the strip host aligns children to flex-start, and the absolute body below measures this width.
    <View style={{ alignSelf: "stretch" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((e) => !e)}
        hitSlop={s.hitSlop}
        style={s.toggle}
        testID="notice-details-toggle"
      >
        <Text style={s.label}>{label}</Text>
        <Icon name={detailsChevronName(expanded, direction)} size={s.chevronSize} color={s.chevronColor} />
      </Pressable>
      <Animated.View
        style={[{ overflow: "hidden" }, bodyStyle]}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      >
        {/* Absolute so it measures at full width whatever the animated height is. */}
        <View style={{ position: "absolute", top: 0, start: 0, end: 0 }} onLayout={(e) => setNatural(e.nativeEvent.layout.height)}>
          <Text style={textStyle} testID="notice-details-text">
            {details}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
