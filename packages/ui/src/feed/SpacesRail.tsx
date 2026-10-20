import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { theme } from "../theme";
import { rubik } from "../foundation/style";
import { feedCopy } from "./copy";

export interface SpacesRailProps {
  /** Hebrew default, prop-overridable per ADR 0007. */
  title?: string;
  /** <SpaceCard>s. */
  children?: ReactNode;
}

/**
 * Lab `.sec` + `.spaces`: section title, then a horizontal rail with 12px
 * gaps and 18px gutters. Horizontal ScrollView starts at the reading edge in
 * RTL (invariant #9 — the rail scrolls the RTL way by construction).
 */
export function SpacesRail({ title = feedCopy.spacesTitle, children }: SpacesRailProps) {
  return (
    <View testID="spaces-rail">
      <View style={{ paddingTop: 4, paddingHorizontal: 18, paddingBottom: 8 }}>
        <Text style={{ ...rubik(15), color: theme.colors.ink900 }}>{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 18, paddingBottom: 16 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
