import { Pressable, Text } from "react-native";
import { resolveMiniButtonStyle, type MiniButtonVariant } from "./MiniButton.styles";

export interface MiniButtonProps {
  label: string;
  variant?: MiniButtonVariant;
  onPress?: () => void;
  testID?: string;
}

/** Lab `.mini` — the compact action button inside notices and strips. */
export function MiniButton({ label, variant = "primary", onPress, testID }: MiniButtonProps) {
  const { container, label: labelStyle } = resolveMiniButtonStyle(variant);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={container} testID={testID}>
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}
