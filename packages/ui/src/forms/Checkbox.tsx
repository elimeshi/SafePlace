import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "../content/Icon";
import { theme } from "../theme";
import {
  checkboxLabelStyle,
  checkboxRowStyle,
  resolveCheckboxStyle,
} from "./Checkbox.styles";

export interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Caller-provided label — often contains inline links (e.g. terms of use). */
  label?: ReactNode;
  disabled?: boolean;
  /** Render for the full-bleed onboarding glass card (translucent box). */
  onGlass?: boolean;
  /** Flag the box when a required consent was left unchecked on submit. */
  error?: boolean;
}

/**
 * Safe-Place Checkbox — the single terms-of-service consent control on
 * onboarding step 2 (spec §6.2.2). Ported from
 * design-reference/components/forms/Checkbox.jsx. The label is entirely
 * caller-supplied so Hebrew copy never gets hardcoded into component logic.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  onGlass = false,
  error = false,
}: CheckboxProps) {
  const { box, checkColor } = resolveCheckboxStyle({ checked, onGlass, error });

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[checkboxRowStyle, disabled ? { opacity: 0.5 } : null]}
    >
      <View style={box}>
        {checked ? (
          <Icon name="check" size={16} color={checkColor} strokeWidth={3} />
        ) : null}
      </View>
      {label ? (
        <Text style={[checkboxLabelStyle, onGlass ? { color: theme.colors.white } : null]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
