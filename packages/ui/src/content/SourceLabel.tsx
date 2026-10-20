import { Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { contentCopy } from "./copy";
import { resolveSourceLabelStyle, type SourceLabelKind } from "./SourceLabel.styles";

export type { SourceLabelKind } from "./SourceLabel.styles";

export interface SourceLabelProps {
  kind: SourceLabelKind;
  /** Space name (kind="group" | "family_space"). */
  name?: string;
  /** Space colour from the group palette. */
  color?: string;
  /** Leading icon (spaces only). Defaults: users for a group, family for a Family Space. */
  icon?: IconName;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  publicLabel?: string;
  followersLabel?: string;
  suggestedLabel?: string;
}

/**
 * SourceLabel — the small coloured provenance tag under a poster's name
 * (feed-spec §2.3.4–2.3.5, lab `.lbl`). Presentation only: the caller maps
 * api-client's `SourceLabel` (resolveSourceLabel) onto these props after
 * looking up the group's name/colour/icon.
 */
export function SourceLabel({
  kind,
  name,
  color,
  icon,
  publicLabel = contentCopy.publicLabel,
  followersLabel = contentCopy.followersLabel,
  suggestedLabel = contentCopy.suggestedLabel,
}: SourceLabelProps) {
  const { container, label, iconColor, iconSize } = resolveSourceLabelStyle({ kind, color });
  const isSpace = kind === "group" || kind === "family_space";
  const text = isSpace
    ? (name ?? contentCopy.groupFallbackName)
    : kind === "suggested"
      ? suggestedLabel
      : kind === "followers"
        ? followersLabel
        : publicLabel;
  const iconName: IconName = icon ?? (kind === "family_space" ? "family" : "users");

  return (
    <View style={container} testID="source-label">
      {isSpace ? <Icon name={iconName} size={iconSize} color={iconColor} /> : null}
      <Text style={label} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
