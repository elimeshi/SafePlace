import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Avatar } from "../content/Avatar";
import { Icon } from "../content/Icon";
import { feedCopy, formatCount } from "./copy";
import { resolveFollowRailStyle } from "./FollowRail.styles";

export interface FollowRailItem {
  userId: string;
  name: string;
  avatar?: string;
  /** Not provided by api-client's FollowSuggestion yet; omitted → the line stays blank (lab reserves its height). */
  bio?: string;
  /** Number only; omitted → hidden. */
  followers?: number;
}

export interface FollowRailProps {
  items: FollowRailItem[];
  onFollow?: (userId: string) => void;
  /** The X: hides the rail for the session. */
  onDismiss?: () => void;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  title?: string;
  followLabel?: string;
  followersSuffix?: string;
  dismissLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Sticky, dismissible follow-suggestions rail (01 §6.4). Placement (bottom of the screen) is the caller's. */
export function FollowRail({
  items,
  onFollow,
  onDismiss,
  title = feedCopy.followTitle,
  followLabel = feedCopy.followButton,
  followersSuffix = feedCopy.followersSuffix,
  dismissLabel = feedCopy.dismissA11y,
  style,
}: FollowRailProps) {
  const s = resolveFollowRailStyle();
  return (
    <View style={[s.rail, style]} testID="follow-rail">
      <View style={s.top}>
        <Text style={s.title}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={dismissLabel} onPress={onDismiss} testID="follow-dismiss">
          <Icon name="x" size={20} color={s.closeColor} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {items.map((it) => (
          <View key={it.userId} style={s.card} testID="follow-card">
            <Avatar name={it.name} src={it.avatar} size={54} />
            <Text style={s.name} numberOfLines={1}>
              {it.name}
            </Text>
            <Text style={s.bio}>{it.bio ?? ""}</Text>
            <Text style={s.count}>{it.followers != null ? `${formatCount(it.followers)} ${followersSuffix}` : " "}</Text>
            <Pressable accessibilityRole="button" onPress={() => onFollow?.(it.userId)} style={s.button}>
              <Text style={s.buttonText}>{followLabel}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
