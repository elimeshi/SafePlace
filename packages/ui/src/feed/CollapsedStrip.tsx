import { Pressable, Text, View } from "react-native";
import { Avatar } from "../content/Avatar";
import { Icon } from "../content/Icon";
import { feedCopy } from "./copy";
import { resolveCollapsedStripStyle, STRIP_AVATAR_SIZE } from "./CollapsedStrip.styles";

export interface CollapsedStripProps {
  /** Avatars of the zones' content (statuses / spaces authors); the "+" placeholder when none. */
  avatars?: Array<{ name: string; src?: string }>;
  /** Chevron points up while the zones are expanded over the feed. */
  expanded?: boolean;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  label?: string;
  onPress?: () => void;
}

/** The thin sticky strip the top zones collapse into (01 §6.2). Tapping re-expands them. */
export function CollapsedStrip({
  avatars = [{ name: "+" }],
  expanded = false,
  label = expanded ? feedCopy.stripCollapse : feedCopy.stripExpand,
  onPress,
}: CollapsedStripProps) {
  const s = resolveCollapsedStripStyle();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.strip} testID="collapsed-strip">
      <View style={s.avatars}>
        {avatars.map((a, i) => (
          <View key={`${a.name}-${i}`} style={[s.avatarRing, i > 0 ? s.avatarOverlap : null]}>
            <Avatar name={a.name} src={a.src} size={STRIP_AVATAR_SIZE} />
          </View>
        ))}
      </View>
      <Text style={s.label}>{label}</Text>
      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={s.chevronSize} color={s.chevronColor} />
    </Pressable>
  );
}
