import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { feedGradients } from "@safeplace/design-tokens";
import { GradientFill } from "../foundation/GradientFill";
import { Icon, type IconName } from "../content/Icon";
import { theme } from "../theme";
import { resolveSpaceCardStyle } from "./SpaceCard.styles";

export interface SpaceCardProps {
  kind: "group" | "family_space";
  name: string;
  /** Group colour from the palette; a Family Space ignores it (brand gradient). */
  color?: string;
  /** Group icon; a Family Space always shows the house. */
  icon?: IconName;
  /** Latest-post text preview (shown when there is no media). */
  previewText?: string;
  /** Latest-post media, already resolved by the caller (e.g. an <Image>). */
  media?: ReactNode;
  /**
   * The latest post's media is withheld by the viewer's filter. The caller
   * decides (visibility-policy / RLS); the card only swaps the body for a quiet
   * indigo panel with the eye icon. (Not drawn in the lab — flagged.)
   */
  filtered?: boolean;
  /** "{author} · {time}" is built here from the two parts. */
  lastAuthor?: string;
  time?: string;
  onPress?: () => void;
}

/**
 * Spaces-rail card (feed-spec §2.2). Family Space: gradient header + house icon;
 * its latest post is shown here under the carve-out (invariant #6), and only
 * here and on the single-post screen — never in the main feed.
 */
export function SpaceCard({
  kind,
  name,
  color = theme.colors.primary,
  icon = "users",
  previewText,
  media,
  filtered = false,
  lastAuthor,
  time,
  onPress,
}: SpaceCardProps) {
  const s = resolveSpaceCardStyle();
  const family = kind === "family_space";
  const header = (
    <>
      <Icon name={family ? "family" : icon} size={s.headerIconSize} color="#FFFFFF" />
      <Text style={[s.headerText, { color: "#FFFFFF" }]} numberOfLines={1}>
        {name}
      </Text>
    </>
  );
  const footer = [lastAuthor, time].filter(Boolean).join(" · ");
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.card} testID="space-card">
      {family ? (
        <GradientFill gradient={feedGradients.familySpace} style={s.header}>
          {header}
        </GradientFill>
      ) : (
        <View style={[s.header, { backgroundColor: color }]}>{header}</View>
      )}
      {filtered ? (
        <GradientFill gradient={feedGradients.filteredPanel} style={[s.body, { alignItems: "center", justifyContent: "center" }]}>
          <Icon name="eye" size={20} color={theme.colors.primary} />
        </GradientFill>
      ) : media ? (
        <View style={s.body}>{media}</View>
      ) : (
        <View style={[s.body, s.bodyText]}>
          <Text style={s.bodyTextStyle}>{previewText}</Text>
        </View>
      )}
      {footer ? (
        <Text style={s.footer} numberOfLines={1}>
          {footer}
        </Text>
      ) : null}
    </Pressable>
  );
}
