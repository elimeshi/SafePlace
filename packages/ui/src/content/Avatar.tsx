import { Image, Text, View } from "react-native";
import { theme } from "../theme";
import {
  avatarFallbackInitial,
  avatarInnerSize,
  resolveAvatarStyle,
} from "./Avatar.styles";

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  /** Colored ring = unseen status in the stories rail (feed-spec §2.1.2). */
  ring?: boolean;
  ringColor?: string;
}

/**
 * Safe-Place Avatar. Round profile image; falls back to the first initial
 * of `name` on a soft blue tint when no `src` is given. The optional `ring`
 * marks an unseen story in the stories rail — a colored border with a small
 * white gap between the ring and the avatar itself. Ported from
 * design-reference/components/content/Avatar.jsx.
 */
export function Avatar({
  src,
  name = "",
  size = 44,
  ring = false,
  ringColor = theme.colors.primary,
}: AvatarProps) {
  const { outer, image } = resolveAvatarStyle({ size, ring, ringColor });
  const initial = avatarFallbackInitial(name);
  const fontSize = Math.round(avatarInnerSize(size, ring) * 0.42);

  return (
    <View style={outer}>
      {src ? (
        <Image
          accessibilityLabel={name || undefined}
          resizeMode="cover"
          source={{ uri: src }}
          style={image}
        />
      ) : (
        <View style={image}>
          <Text
            style={{
              color: theme.colors.primary,
              fontFamily: theme.fontFamily.semibold,
              fontSize,
            }}
          >
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
}
