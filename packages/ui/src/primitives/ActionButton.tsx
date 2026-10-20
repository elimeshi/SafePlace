import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { resolveActionButtonStyle, type ActionButtonVariant } from "./ActionButton.styles";

export type { ActionButtonVariant } from "./ActionButton.styles";

export interface ActionButtonProps {
  label: string;
  variant?: ActionButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Lab `.cta`: the large action button of sheets and empty/error states. */
export function ActionButton({ label, variant = "primary", onPress, disabled, style, testID }: ActionButtonProps) {
  const { container, label: labelStyle } = resolveActionButtonStyle(variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[container, style]}
      testID={testID}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}
