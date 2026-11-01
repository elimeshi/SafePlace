import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Icon } from "./Icon";
import { NoticeDetails } from "./NoticeDetails";
import { contentCopy } from "./copy";
import { resolveStateStripStyle, type StateStripKind } from "./StateStrip.styles";

export type { StateStripKind } from "./StateStrip.styles";

export interface StateStripProps {
  kind: StateStripKind;
  /** Hebrew defaults for processing / review, prop-overridable (ADR 0007). The notice has no default: pass the shared-types copy. */
  message?: string;
  /** Action row (notice kind): MiniButtons. */
  actions?: ReactNode;
  /** Notice kind: the found group names behind a "what was found?" disclosure. Omitted or empty → no disclosure. */
  details?: string;
  detailsLabel?: string;
}

/** Processing / under-review / post-hoc notice strip at the foot of a post. */
export function StateStrip({ kind, message, actions, details, detailsLabel = contentCopy.noticeDetails }: StateStripProps) {
  const s = resolveStateStripStyle(kind);
  const text = message ?? (kind === "processing" ? contentCopy.processingStrip : kind === "review" ? contentCopy.reviewStrip : "");
  return (
    <View style={s.container} testID={`state-strip-${kind}`}>
      {kind === "notice" ? (
        <Text style={s.text}>{text}</Text>
      ) : (
        <>
          <Icon name={s.iconName} size={s.iconSize} color={s.iconColor} />
          <Text style={s.text}>{text}</Text>
        </>
      )}
      {kind === "notice" && details ? <NoticeDetails label={detailsLabel} details={details} textStyle={s.text} /> : null}
      {actions ? <View style={s.actions}>{actions}</View> : null}
    </View>
  );
}
