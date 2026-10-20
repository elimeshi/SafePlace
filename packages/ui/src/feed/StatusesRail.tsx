import { Pressable, Text, View } from "react-native";
import { feedGradients } from "@safeplace/design-tokens";
import { GradientFill } from "../foundation/GradientFill";
import { Icon } from "../content/Icon";
import { feedCopy } from "./copy";
import { PLUS_SIZE, resolveStatusesRailStyle } from "./StatusesRail.styles";

export interface StatusesRailProps {
  onCreate?: () => void;
  /** Hebrew defaults, prop-overridable per ADR 0007. `emptyHint={null}` hides the hint (empty-feed / skeleton screens). */
  createLabel?: string;
  emptyHint?: string | null;
}

/**
 * Statuses rail, Phase 4 form: no table, no viewer — only the gradient "+"
 * that opens the create menu, and the empty hint (plan §2 Statuses).
 */
export function StatusesRail({
  onCreate,
  createLabel = feedCopy.createLabel,
  emptyHint = feedCopy.statusesEmptyHint,
}: StatusesRailProps) {
  const s = resolveStatusesRailStyle();
  return (
    <View style={s.row} testID="statuses-rail">
      <View style={s.story}>
        <Pressable accessibilityRole="button" accessibilityLabel={createLabel} onPress={onCreate} testID="statuses-create">
          <GradientFill gradient={feedGradients.createFill} width={PLUS_SIZE} height={PLUS_SIZE} style={s.plus}>
            <Icon name="plus" size={s.plusIconSize} color="#FFFFFF" />
          </GradientFill>
        </Pressable>
        <View style={s.caption}>
          <Text style={s.captionText}>{createLabel}</Text>
        </View>
      </View>
      {emptyHint ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{emptyHint}</Text>
        </View>
      ) : null}
    </View>
  );
}
