import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "../theme";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { contentCopy } from "./copy";
import { QUOTE_BODY_LINES, resolveQuoteStyle } from "./QuoteCard.styles";

export type QuoteCardProps =
  | {
      state: "available";
      author: { name: string; avatar?: string };
      time: string;
      body: string;
      /** The original's media, already resolved/filtered by the caller (each viewer's filter still applies). */
      media?: ReactNode;
      onPress?: () => void;
    }
  | {
      state: "unavailable";
      /** Hebrew default, prop-overridable per ADR 0007. */
      message?: string;
    };

/**
 * The original embedded in a share-to-group quote post (03 §5.5). Embedded,
 * never copied: tapping opens the original; if the viewer cannot see it the
 * card reads "unavailable" (deleted, hidden and blocked are indistinguishable).
 */
export function QuoteCard(props: QuoteCardProps) {
  const s = resolveQuoteStyle();
  if (props.state === "unavailable") {
    return (
      <View style={s.gone} testID="quote-unavailable">
        <Icon name="lock" size={s.goneIconSize} color={theme.colors.ink400} />
        <Text style={s.goneText}>{props.message ?? contentCopy.quoteUnavailable}</Text>
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={props.onPress} style={s.container} testID="quote-card">
      <View style={s.head}>
        <Avatar name={props.author.name} src={props.author.avatar} size={s.avatarSize} />
        <Text style={s.name}>{props.author.name}</Text>
        <Text style={s.time}>{props.time}</Text>
      </View>
      <Text style={s.body} numberOfLines={QUOTE_BODY_LINES}>
        {props.body}
      </Text>
      {props.media ? <View style={s.media}>{props.media}</View> : null}
    </Pressable>
  );
}
