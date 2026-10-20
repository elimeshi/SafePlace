import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Avatar } from "../content/Avatar";
import { Icon, type IconName } from "../content/Icon";
import { arrowNames, useDirection } from "../foundation/direction";
import { theme } from "../theme";
import { composeCopy } from "./copy";
import { resolveComposeStyle, resolvePostTopBarStyle } from "./ComposeParts.styles";

/** Lab `.ctop`: close, title, Publish. Publish never waits on classification. */
export function ComposeTopBar({
  title = composeCopy.newPost,
  publishLabel = composeCopy.publish,
  canPublish,
  onClose,
  onPublish,
  closeLabel = composeCopy.closeA11y,
}: {
  title?: string;
  publishLabel?: string;
  /** Dimmed (.4) and inert when false. */
  canPublish: boolean;
  onClose?: () => void;
  onPublish?: () => void;
  closeLabel?: string;
}) {
  const s = resolveComposeStyle();
  return (
    <View style={s.top} testID="compose-top">
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={s.iconButton}>
        <Icon name="x" size={22} color={theme.colors.ink700} />
      </Pressable>
      <Text style={s.title}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canPublish }}
        disabled={!canPublish}
        onPress={onPublish}
        style={[s.publish, canPublish ? s.publishLive : s.publishDim]}
        testID="compose-publish"
      >
        <Text style={s.publishText}>{publishLabel}</Text>
      </Pressable>
    </View>
  );
}

/** Lab `.cid`: author avatar + name with the exposure chip (and help) beneath. */
export function ComposeIdentity({ name, avatar, children }: { name: string; avatar?: string; children?: ReactNode }) {
  const s = resolveComposeStyle();
  return (
    <View style={s.identity}>
      <Avatar name={name} src={avatar} size={44} />
      <View style={s.identityColumn}>
        <Text style={s.identityName}>{name}</Text>
        {children}
      </View>
    </View>
  );
}

/** Lab `.ctext`: the 17px post text field. */
export function ComposeTextField({
  value,
  onChangeText,
  placeholder = composeCopy.placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const s = resolveComposeStyle();
  return (
    <TextInput
      multiline
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.ink400}
      style={s.text}
      testID="compose-text"
    />
  );
}

/**
 * Lab `.cmedia`: the attached media with its remove (X) button and the
 * "checking the media…" chip while classification runs. `children` is the
 * image itself (the screen resolves it — it is the author's own, unfiltered).
 */
export function ComposeMediaPreview({
  children,
  height,
  checking = false,
  checkingLabel = composeCopy.checkingMedia,
  onRemove,
  removeLabel = composeCopy.removeA11y,
}: {
  children: ReactNode;
  height?: number;
  checking?: boolean;
  checkingLabel?: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const s = resolveComposeStyle();
  return (
    <View style={[s.mediaBox, height != null ? { height } : null]} testID="compose-media">
      {children}
      <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} onPress={onRemove} style={s.mediaRemove}>
        <Icon name="x" size={16} color="#FFFFFF" />
      </Pressable>
      {checking ? (
        <View style={s.mediaChip}>
          <Icon name="clock" size={14} color={theme.colors.cyan700} />
          <Text style={s.mediaChipText}>{checkingLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Lab `.cloc`: the place-name chip (a name only, never coordinates — 02 §3.5). */
export function LocationChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const s = resolveComposeStyle();
  return (
    <View style={s.locationChip} testID="location-chip">
      <Icon name="map-pin" size={14} color={theme.colors.ink700} />
      <Text style={s.locationText}>{name}</Text>
      <Pressable accessibilityRole="button" onPress={onRemove}>
        <Icon name="x" size={14} color={theme.colors.ink400} />
      </Pressable>
    </View>
  );
}

/** Lab `.abar`: attach media / add location. */
export function ComposeActionBar({
  onMedia,
  onLocation,
  mediaLabel = composeCopy.media,
  locationLabel = composeCopy.location,
}: {
  onMedia?: () => void;
  onLocation?: () => void;
  mediaLabel?: string;
  locationLabel?: string;
}) {
  const s = resolveComposeStyle();
  const Btn = ({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.actionButton}>
      <Icon name={icon} size={19} color={theme.colors.primary} />
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={s.actionBar} testID="compose-actions">
      <Btn icon="image" label={mediaLabel} onPress={onMedia} />
      <Btn icon="map-pin" label={locationLabel} onPress={onLocation} />
    </View>
  );
}

/** Lab `.ptop`: back arrow + title (single post). */
export function PostTopBar({
  title = composeCopy.postTitle,
  onBack,
  backLabel = composeCopy.backA11y,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const s = resolvePostTopBarStyle();
  const c = resolveComposeStyle();
  const dir = useDirection();
  return (
    <View style={s.bar} testID="post-top-bar">
      <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={c.iconButton}>
        <Icon name={arrowNames(dir).back} size={22} color={theme.colors.ink700} />
      </Pressable>
      <Text style={s.title}>{title}</Text>
    </View>
  );
}
