import { Pressable, Text, View, type ViewStyle } from "react-native";
import { resolveDoorStyle, resolveGenderChoiceRowStyle } from "./GenderChoice.styles";

export interface GenderChoiceOption {
  value: string;
  label: string;
}

export interface GenderChoiceProps {
  value: string | null;
  onChange: (value: string) => void;
  /** Defaults to גבר / אישה — prop-overridable, never hardcoded downstream. */
  options?: GenderChoiceOption[];
  style?: ViewStyle;
  /** Render for the full-bleed onboarding glass card (translucent doors). */
  onGlass?: boolean;
}

const DEFAULT_OPTIONS: GenderChoiceOption[] = [
  { value: "male", label: "גבר" },
  { value: "female", label: "אישה" },
];

/**
 * Gender selection — the two large "door" buttons from onboarding step 2
 * (spec §6.2.2 / §6.3.2). Presented neutrally: no loaded explanation here,
 * the meaning is deferred to the following step. Selecting a door thickens
 * its border and fills it — "pressing a door", not "ticking a form option".
 * Fully symmetric: both options get the identical mechanism, differing only
 * by which one is currently selected.
 */
export function GenderChoice({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  style,
  onGlass = false,
}: GenderChoiceProps) {
  return (
    <View style={[resolveGenderChoiceRowStyle(), style]}>
      {options.map((opt) => {
        const selected = value === opt.value;
        const { container, label } = resolveDoorStyle({ selected, onGlass });
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={container}
          >
            <Text style={label}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
