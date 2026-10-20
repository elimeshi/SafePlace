import { Image, Text, View } from "react-native";
import { theme } from "../theme";
import { avatarFallbackInitial, resolveAvatarStyle } from "./Avatar.styles";

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  /** Accent ring = unseen status in the stories rail (feed-spec §2.1.2). */
  ring?: boolean;
  ringColor?: string;
  testID?: string;
}

/**
 * Safe-Place Avatar (feed lab `.av`). Round profile image; falls back to the
 * first initial of `name` on a soft blue tint when no `src` is given. The
 * optional `ring` is painted outside the disc, so the disc keeps `size`.
 */
export function Avatar({
  src,
  name = "",
  size = 44,
  ring = false,
  ringColor = theme.colors.accent,
  testID,
}: AvatarProps) {
  const { outer, image, initial } = resolveAvatarStyle({ size, ring, ringColor });
  return (
    <View style={outer} testID={testID}>
      {src ? (
        <Image
          accessibilityLabel={name || undefined}
          resizeMode="cover"
          source={{ uri: src }}
          style={image}
        />
      ) : (
        <Text style={initial}>{avatarFallbackInitial(name)}</Text>
      )}
    </View>
  );
}
