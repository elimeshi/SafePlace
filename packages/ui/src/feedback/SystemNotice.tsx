import { Text, View } from "react-native";
import { Icon } from "../content/Icon";
import { Button } from "../primitives/Button";
import {
  resolveNoticeStyle,
  resolveNoticeTone,
  type NoticeTone,
} from "./SystemNotice.styles";

export type { NoticeTone } from "./SystemNotice.styles";

export interface SystemNoticeProps {
  tone?: NoticeTone;
  /** Caller-supplied — never hardcode copy here (i18n boundary, CLAUDE.md §5). */
  title?: string;
  /** Caller-supplied — never hardcode copy here (i18n boundary, CLAUDE.md §5). */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Safe-Place SystemNotice — a neutral, factual message block. Ported from
 * design-reference/components/feedback/SystemNotice.jsx. Its signature use
 * is the upload content alert (master spec §4.4.2): informs, never
 * blocks or preaches, and lets the user decide. Also used for the Settings
 * dangerous-zone double-confirm flows (§3.6 / §4). All copy — title,
 * message, button labels — is passed in by the caller.
 */
export function SystemNotice({
  tone = "info",
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: SystemNoticeProps) {
  const { iconName, iconColor } = resolveNoticeTone(tone);
  const { container, iconWrap, column, title: titleStyle, message: messageStyle, actionsRow } =
    resolveNoticeStyle(tone);

  return (
    <View accessibilityRole="text" style={container}>
      <View style={iconWrap}>
        <Icon name={iconName} size={22} color={iconColor} />
      </View>
      <View style={column}>
        {title ? <Text style={titleStyle}>{title}</Text> : null}
        {message ? <Text style={messageStyle}>{message}</Text> : null}
        {confirmLabel || cancelLabel ? (
          <View style={actionsRow}>
            {confirmLabel ? (
              <Button
                size="sm"
                variant={tone === "danger" ? "danger" : "primary"}
                onPress={onConfirm}
              >
                {confirmLabel}
              </Button>
            ) : null}
            {cancelLabel ? (
              <Button size="sm" variant="secondary" onPress={onCancel}>
                {cancelLabel}
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
