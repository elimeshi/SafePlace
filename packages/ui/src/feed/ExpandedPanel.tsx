import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { shadows } from "@safeplace/design-tokens";
import { Icon } from "../content/Icon";
import { theme } from "../theme";
import { assistant } from "../foundation/style";
import { feedCopy } from "./copy";

/**
 * Lab `.xpanel`: the top zones re-expanded over the scrolled feed (01 §6.3),
 * with a "tap to collapse" handle. Positioned over the feed by the screen's
 * root (absolute, top 0); `paddingTop` is the 46px status-bar band.
 */
export function ExpandedPanel({
  children,
  onCollapse,
  collapseLabel = feedCopy.stripCollapse,
  topInset = 46,
}: {
  children: ReactNode;
  onCollapse?: () => void;
  collapseLabel?: string;
  topInset?: number;
}) {
  return (
    <Pressable
      accessible={false}
      style={{
        position: "absolute",
        top: 0,
        start: 0,
        end: 0,
        zIndex: 5,
        backgroundColor: theme.colors.background,
        borderBottomStartRadius: 24,
        borderBottomEndRadius: 24,
        paddingTop: topInset,
        boxShadow: shadows.panel,
      }}
      testID="expanded-panel"
    >
      {children}
      <Pressable
        accessibilityRole="button"
        onPress={onCollapse}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4, paddingBottom: 12 }}
      >
        <Icon name="chevron-up" size={18} color={theme.colors.ink500} />
        <Text style={{ ...assistant(13, 600), color: theme.colors.ink500 }}>{collapseLabel}</Text>
      </Pressable>
    </Pressable>
  );
}
