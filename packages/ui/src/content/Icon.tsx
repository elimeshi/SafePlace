import type { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { theme } from "../theme";
import { buildIconSvg, type IconName } from "./Icon.glyphs";

export { ICON_NAMES } from "./Icon.glyphs";
export type { IconName } from "./Icon.glyphs";

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** RN has no color inheritance — pass a color explicitly (defaults to a neutral ink). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Icon — a curated Lucide outline glyph rendered via react-native-svg. The
 * glyph markup uses currentColor, which the `color` prop replaces. Lucide is
 * the flagged substitution (ADR 0005). Direction-neutral: glyphs are not
 * mirrored automatically — pass a direction-appropriate name (e.g.
 * chevron-left vs the RTL equivalent) at the call site where it matters.
 */
export function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  color = theme.colors.ink700,
  style,
}: IconProps) {
  return (
    <SvgXml
      xml={buildIconSvg(name, { size, strokeWidth })}
      width={size}
      height={size}
      color={color}
      style={style}
    />
  );
}
