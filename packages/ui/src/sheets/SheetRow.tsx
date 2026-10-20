import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "../content/Icon";
import { arrowNames, useDirection } from "../foundation/direction";
import { resolveSheetControlStyle, resolveSheetRowStyle } from "./Sheet.styles";

export interface SheetRowProps {
  label: string;
  /** Second line (lab `em`): hint, "בקרוב", member count. */
  hint?: string;
  /** Leading glyph in the primary colour. */
  icon?: IconName;
  /** Leading rounded tile instead (lab `.gico`): group colour + icon, plus-menu rows. */
  tile?: { icon: IconName; background: string; color: string };
  /** Leading checkbox / radio. */
  control?: { type: "checkbox" | "radio"; checked: boolean };
  /**
   * The RTL-correct disclosure arrow — muted ("forward", exposure rows) or
   * primary ("forward-primary", the "+" menu, as the lab draws each) — or any
   * node (a Toggle).
   */
  trailing?: "forward" | "forward-primary" | ReactNode;
  /** Greyed (opacity .45) and inert — "coming soon" / not combinable. */
  disabled?: boolean;
  selected?: boolean;
  /** Tighter 10px padding (report reasons). */
  dense?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Lab `.srow`: one row of a bottom sheet. */
export function SheetRow({
  label,
  hint,
  icon,
  tile,
  control,
  trailing,
  disabled = false,
  selected = false,
  dense = false,
  onPress,
  testID,
}: SheetRowProps) {
  const s = resolveSheetRowStyle({ disabled, selected, dense });
  const dir = useDirection();
  const box = control ? resolveSheetControlStyle(control.type, control.checked) : null;
  return (
    <Pressable
      accessibilityRole={control ? (control.type === "radio" ? "radio" : "checkbox") : "button"}
      accessibilityState={{ disabled, checked: control?.checked }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={s.row}
      testID={testID}
    >
      {box && control ? (
        <View style={box.box}>
          {control.type === "checkbox" && control.checked ? <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3} /> : null}
          {control.type === "radio" && control.checked ? <View style={box.dot} /> : null}
        </View>
      ) : null}
      {tile ? (
        <View style={[s.tile, { backgroundColor: tile.background }]}>
          <Icon name={tile.icon} size={s.tileIconSize} color={tile.color} />
        </View>
      ) : icon ? (
        <Icon name={icon} size={s.iconSize} color={s.iconColor} />
      ) : null}
      <View style={s.text}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
      {trailing === "forward" || trailing === "forward-primary" ? (
        <Icon name={arrowNames(dir).forward} size={18} color={trailing === "forward" ? s.trailingColor : s.iconColor} />
      ) : (
        trailing
      )}
    </Pressable>
  );
}
