import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { MiniButton } from "./MiniButton";
import { NoticeDetails } from "./NoticeDetails";
import { StateStrip } from "./StateStrip";
import { contentCopy } from "./copy";
import { resolveUploaderNoticeStyle } from "./UploaderNotice.styles";

export interface UploaderNoticeProps {
  /**
   * "beforePublish": classification landed while composing — inline card with
   * Confirm / Back / Appeal. "afterPublish": it landed after Publish — a strip
   * on the author's own post with Understood / Remove media / Appeal.
   * Never a block: every action is the uploader's choice (invariant #1).
   */
  mode: "beforePublish" | "afterPublish";
  onConfirm?: () => void;
  onBack?: () => void;
  onUnderstood?: () => void;
  onRemoveMedia?: () => void;
  onAppeal?: () => void;
  /** Defaults to the shared-types notice, verbatim; overridable per ADR 0007. */
  message?: string;
  /** The found group names, already joined; shown behind `detailsLabel`. Omitted or empty → no disclosure. */
  details?: string;
  detailsLabel?: string;
  confirmLabel?: string;
  backLabel?: string;
  appealLabel?: string;
  understoodLabel?: string;
  removeMediaLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function UploaderNotice({
  mode,
  onConfirm,
  onBack,
  onUnderstood,
  onRemoveMedia,
  onAppeal,
  message = contentCopy.contentNotice,
  details,
  detailsLabel = contentCopy.noticeDetails,
  confirmLabel = contentCopy.noticeConfirm,
  backLabel = contentCopy.noticeBack,
  appealLabel = contentCopy.noticeAppeal,
  understoodLabel = contentCopy.noticeUnderstood,
  removeMediaLabel = contentCopy.noticeRemoveMedia,
  style,
}: UploaderNoticeProps) {
  if (mode === "afterPublish") {
    return (
      <StateStrip
        kind="notice"
        message={message}
        details={details}
        detailsLabel={detailsLabel}
        actions={
          <>
            <MiniButton label={understoodLabel} onPress={onUnderstood} testID="notice-understood" />
            <MiniButton label={removeMediaLabel} variant="secondary" onPress={onRemoveMedia} testID="notice-remove" />
            <MiniButton label={appealLabel} variant="ghost" onPress={onAppeal} testID="notice-appeal" />
          </>
        }
      />
    );
  }
  const s = resolveUploaderNoticeStyle();
  return (
    <View style={[s.container, style]} testID="uploader-notice">
      <View style={s.iconWrap}>
        <Icon name="info" size={s.iconSize} color={s.iconColor} />
      </View>
      <View style={s.column}>
        <Text style={s.text}>{message}</Text>
        {details ? (
          <View style={s.details}>
            <NoticeDetails label={detailsLabel} details={details} textStyle={[s.text, { marginBottom: 0 }]} />
          </View>
        ) : null}
        <View style={s.actions}>
          <MiniButton label={confirmLabel} onPress={onConfirm} testID="notice-confirm" />
          <MiniButton label={backLabel} variant="secondary" onPress={onBack} testID="notice-back" />
          <MiniButton label={appealLabel} variant="ghost" onPress={onAppeal} testID="notice-appeal" />
        </View>
      </View>
    </View>
  );
}
