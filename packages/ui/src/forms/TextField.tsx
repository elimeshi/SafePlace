import { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { Icon } from "../content/Icon";
import { theme } from "../theme";
import { FIELD_MIN_HEIGHT, resolveFieldStyle } from "./TextField.styles";

/** 3px soft focus ring around the field, per spec §6.3.2 (--shadow-focus). */
const FOCUS_RING_WIDTH = 3;
const CHECK_ICON_SIZE = 16;

export interface TextFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  /** Shows the small success check at the field's end. */
  valid?: boolean;
  errorText?: string;
}

/**
 * Safe-Place text field with a floating label (spec §6.3.2). Ported from
 * design-reference/components/forms/TextField.jsx. Resting: a thin neutral
 * border. Focused: a thicker primary border plus a soft blue focus ring
 * (an outer wrapper View, since RN has no native `box-shadow` spread).
 * Valid entries show a small check at the field's end — a flow-relative
 * position, so it lands on the correct side automatically under RTL. Label,
 * placeholder and errorText are caller-supplied strings — already
 * i18n-safe.
 */
export function TextField({
  value,
  onChangeText,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  valid = false,
  errorText,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const floated = focused || hasValue;
  const { wrapper, input, label: labelStyle, showCheck } = resolveFieldStyle({
    focused,
    valid,
    hasValue,
  });

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View
        style={{
          borderRadius: theme.radius.sm + FOCUS_RING_WIDTH,
          padding: focused ? FOCUS_RING_WIDTH : 0,
          backgroundColor: focused ? theme.colors.blue100 : "transparent",
        }}
      >
        <View
          style={[wrapper, errorText ? { borderColor: theme.colors.danger } : null]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={floated ? placeholder : undefined}
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={input}
            accessibilityLabel={label}
          />
          <Text style={[labelStyle, { pointerEvents: "none" }]}>
            {label}
          </Text>
          {showCheck && !errorText ? (
            <Icon
              name="check"
              size={CHECK_ICON_SIZE}
              color={theme.colors.success}
              style={{
                position: "absolute",
                end: theme.spacing.md,
                top: (FIELD_MIN_HEIGHT - CHECK_ICON_SIZE) / 2,
              }}
            />
          ) : null}
        </View>
      </View>
      {errorText ? (
        <Text style={[theme.typeRole.meta, { color: theme.colors.danger }]}>
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}
