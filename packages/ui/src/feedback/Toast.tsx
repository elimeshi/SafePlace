import { useEffect } from "react";
import { Text, View } from "react-native";
import { Icon, type IconName } from "../content/Icon";
import { resolveToastStyle } from "./Toast.styles";

export interface ToastProps {
  message: string;
  icon?: IconName;
  /** Distance from the bottom of the positioned parent (lab: 96, above the tab bar). */
  bottom?: number;
  /** Auto-hide after this long via `onHide`; omit to stay until the caller hides it. */
  durationMs?: number;
  onHide?: () => void;
}

/** Transient confirmation (lab `.toast`), e.g. the report-sent toast. No animation is specified, so none is added. */
export function Toast({ message, icon = "check", bottom = 96, durationMs, onHide }: ToastProps) {
  const s = resolveToastStyle(bottom);
  useEffect(() => {
    if (!durationMs || !onHide) return;
    const t = setTimeout(onHide, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onHide]);
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.container} testID="toast">
      <Icon name={icon} size={s.iconSize} color="#FFFFFF" />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}
