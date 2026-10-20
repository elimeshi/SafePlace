import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "../content/Icon";
import { resolveExposureChipStyle } from "./ExposureChip.styles";

export interface ExposureChipProps {
  label: string;
  icon: IconName;
  /** Group / Family Space compose: the audience is that one space, fixed (02 §4.3). */
  locked?: boolean;
  /** Explanation under a locked chip. */
  help?: string;
  onPress?: () => void;
}

/** The audience chip in compose: tap to open the picker (unlocked) or just show the fixed audience (locked). */
export function ExposureChip({ label, icon, locked = false, help, onPress }: ExposureChipProps) {
  const s = resolveExposureChipStyle(locked);
  return (
    <>
      <Pressable
        accessibilityRole={locked ? undefined : "button"}
        disabled={locked || !onPress}
        onPress={onPress}
        style={s.chip}
        testID="exposure-chip"
      >
        <Icon name={locked ? "lock" : icon} size={s.iconSize} color={s.color} />
        <Text style={s.text}>{label}</Text>
        {locked ? null : <Icon name="chevron-down" size={s.iconSize} color={s.color} />}
      </Pressable>
      {help ? (
        <View>
          <Text style={s.help}>{help}</Text>
        </View>
      ) : null}
    </>
  );
}
