import { Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import {
  resolveSourceLabelStyle,
  type SourceLabelKind,
} from "./SourceLabel.styles";

export type { SourceLabelKind } from "./SourceLabel.styles";

export interface SourceLabelProps {
  kind: SourceLabelKind;
  /** Group name (kind="group"). */
  name?: string;
  /** Group color from the group palette (kind="group"). */
  color?: string;
  /** Leading icon (kind="group" only). */
  icon?: IconName;
  /** Hebrew default, prop-overridable per ADR 0007. */
  publicLabel?: string;
  /** Hebrew default, prop-overridable per ADR 0007. */
  suggestedLabel?: string;
}

const DEFAULT_GROUP_NAME = "קבוצה";
const DEFAULT_PUBLIC_LABEL = "פוסט ציבורי";
const DEFAULT_SUGGESTED_LABEL = "מוצע עבורך";

/**
 * SourceLabel — the small colored provenance tag shown under a poster's name
 * on every post; the eye learns to read post origin by color (feed-spec
 * §2.3.4–2.3.5). Soft ~16% tint background, never full saturation.
 */
export function SourceLabel({
  kind,
  name,
  color,
  icon = "users",
  publicLabel = DEFAULT_PUBLIC_LABEL,
  suggestedLabel = DEFAULT_SUGGESTED_LABEL,
}: SourceLabelProps) {
  const { container, label, iconColor } = resolveSourceLabelStyle({
    kind,
    color,
  });

  const text =
    kind === "group"
      ? (name ?? DEFAULT_GROUP_NAME)
      : kind === "suggested"
        ? suggestedLabel
        : publicLabel;

  return (
    <View style={container}>
      {kind === "group" ? (
        <Icon name={icon} size={13} color={iconColor} strokeWidth={2.4} />
      ) : null}
      <Text style={label} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
