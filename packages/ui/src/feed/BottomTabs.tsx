import { Pressable, Text, View } from "react-native";
import { Icon } from "../content/Icon";
import { feedCopy } from "./copy";
import { resolveBottomTabsStyle, TAB_ICONS, tabVisual, type TabKey } from "./BottomTabs.styles";

export type { TabKey } from "./BottomTabs.styles";

export interface BottomTabsProps {
  active: TabKey;
  onChange?: (tab: TabKey) => void;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  labels?: Partial<Record<TabKey, string>>;
}

const ORDER: TabKey[] = ["home", "search", "profile"];

/** Main navigation (locked: Home / Search / Profile). Search and Profile open a "coming soon" placeholder until they ship. */
export function BottomTabs({ active, onChange, labels }: BottomTabsProps) {
  const s = resolveBottomTabsStyle();
  const text: Record<TabKey, string> = {
    home: labels?.home ?? feedCopy.tabHome,
    search: labels?.search ?? feedCopy.tabSearch,
    profile: labels?.profile ?? feedCopy.tabProfile,
  };
  return (
    <View style={s.bar} accessibilityRole="tablist" testID="bottom-tabs">
      {ORDER.map((key) => {
        const v = tabVisual(key === active);
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === active }}
            onPress={() => onChange?.(key)}
            style={s.tab}
            testID={`tab-${key}`}
          >
            <Icon name={TAB_ICONS[key]} size={22} color={v.color} strokeWidth={v.strokeWidth} />
            <Text style={[s.label, { color: v.color }]}>{text[key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
