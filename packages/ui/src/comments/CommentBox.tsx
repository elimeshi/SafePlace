import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Avatar } from "../content/Avatar";
import { Icon } from "../content/Icon";
import { theme } from "../theme";
import { commentCopy } from "./copy";
import { resolveCommentBoxStyle } from "./CommentBox.styles";

export interface CommentBoxProps {
  /** The viewer (their avatar sits at the start of the box). */
  me: { name: string; avatar?: string };
  value: string;
  onChangeText: (text: string) => void;
  onSend?: () => void;
  /** Attach an image; it goes through the classification pipeline like every upload (invariant #8) — wired by the screen. */
  onAttach?: () => void;
  /** Reply mode: the name being replied to. Shows the bar, the @ chip, and the focus ring. */
  replyingTo?: string;
  onCancelReply?: () => void;
  /** Hebrew defaults, prop-overridable per ADR 0007. */
  placeholder?: string;
  replyingToLabel?: string;
  sendLabel?: string;
  attachLabel?: string;
  cancelReplyLabel?: string;
}

/** The sticky comment box (lab `.cbox`), with reply mode (`.replybar`). */
export function CommentBox({
  me,
  value,
  onChangeText,
  onSend,
  onAttach,
  replyingTo,
  onCancelReply,
  placeholder = commentCopy.placeholder,
  replyingToLabel = commentCopy.replyingTo,
  sendLabel = commentCopy.sendA11y,
  attachLabel = commentCopy.attachA11y,
  cancelReplyLabel = commentCopy.cancelReplyA11y,
}: CommentBoxProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || Boolean(replyingTo);
  const s = resolveCommentBoxStyle(active);
  return (
    <View testID="comment-box">
      {replyingTo ? (
        <View style={s.replyBar} testID="reply-bar">
          <Text style={s.replyText}>
            {replyingToLabel}
            <Text style={s.replyName}>{replyingTo}</Text>
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={cancelReplyLabel} onPress={onCancelReply}>
            <Icon name="x" size={18} color={theme.colors.ink400} />
          </Pressable>
        </View>
      ) : null}
      <View style={s.box}>
        <Avatar name={me.name} src={me.avatar} size={34} />
        <View style={s.field}>
          {replyingTo ? (
            <View style={s.chip}>
              <Text style={s.chipText}>{`@${replyingTo}`}</Text>
            </View>
          ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={replyingTo ? undefined : placeholder}
            placeholderTextColor={s.placeholder}
            style={s.input}
            testID="comment-input"
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={attachLabel} onPress={onAttach} style={s.iconButton} testID="comment-attach">
          <Icon name="image" size={20} color={theme.colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={sendLabel} onPress={onSend} style={s.send} testID="comment-send">
          <Icon name="send" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
