import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "../content/Icon";
import { arrowNames, useDirection } from "../foundation/direction";
import { theme } from "../theme";
import { resolveSheetStyle } from "./Sheet.styles";

export interface BottomSheetProps {
  visible?: boolean;
  title?: string;
  subtitle?: string;
  /** Second-step sheets (e.g. choose groups): a back arrow beside the title. */
  onBack?: () => void;
  /** Scrim press. */
  onDismiss?: () => void;
  children?: ReactNode;
  testID?: string;
}

/**
 * Bottom sheet (lab `.scrim` + `.sheet`): dimmed scrim and a white sheet with
 * a 24px top radius, anchored to the bottom of its positioned parent (the
 * screen root). Presentational overlay — the screen owns `visible`.
 */
export function BottomSheet({ visible = true, title, subtitle, onBack, onDismiss, children, testID }: BottomSheetProps) {
  const s = resolveSheetStyle();
  const dir = useDirection();
  if (!visible) return null;
  return (
    <>
      <Pressable accessibilityRole="button" onPress={onDismiss} style={s.scrim} testID="sheet-scrim" />
      <View style={s.sheet} testID={testID ?? "bottom-sheet"}>
        <View style={s.grab} />
        {onBack ? (
          <View style={s.backRow}>
            <Pressable accessibilityRole="button" onPress={onBack} style={s.backButton} testID="sheet-back">
              <Icon name={arrowNames(dir).back} size={s.backIconSize} color={theme.colors.ink700} />
            </Pressable>
            {title ? <Text style={s.backTitle}>{title}</Text> : null}
          </View>
        ) : title ? (
          <Text style={s.title}>{title}</Text>
        ) : null}
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </>
  );
}

export function SheetDivider() {
  return <View style={resolveSheetStyle().divider} />;
}

export function SheetGroupLabel({ children }: { children: string }) {
  return <Text style={resolveSheetStyle().group}>{children}</Text>;
}
