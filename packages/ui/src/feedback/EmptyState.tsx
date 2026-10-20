import { Text, View } from "react-native";
import { Icon, type IconName } from "../content/Icon";
import { ActionButton } from "../primitives/ActionButton";
import { theme } from "../theme";
import { feedbackCopy } from "./copy";
import { EMPTY_VARIANTS, resolveEmptyStateStyle, type EmptyStateVariant } from "./EmptyState.styles";

export type { EmptyStateVariant } from "./EmptyState.styles";

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** Hebrew defaults (feed copy; Search for comingSoon), prop-overridable per ADR 0007. */
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  /** Override the variant's top padding (the lab pushes error/comingSoon down). */
  paddingTop?: number;
}

const DEFAULTS = {
  empty: feedbackCopy.emptyFeed,
  error: feedbackCopy.feedError,
  comingSoon: { ...feedbackCopy.searchComingSoon, action: undefined },
} as const;

/** Empty / error / coming-soon states — every state has copy, never a blank screen (§7.6). */
export function EmptyState({ variant, title, message, actionLabel, onAction, icon, paddingTop }: EmptyStateProps) {
  const v = EMPTY_VARIANTS[variant];
  const d = DEFAULTS[variant];
  const s = resolveEmptyStateStyle(paddingTop ?? v.paddingTop);
  const action = actionLabel ?? d.action;
  return (
    <View style={s.container} testID={`empty-state-${variant}`}>
      <View style={s.disc}>
        <Icon name={icon ?? v.icon} size={s.iconSize} color={theme.colors.primary} />
      </View>
      <Text style={s.title}>{title ?? d.title}</Text>
      <Text style={s.message}>{message ?? d.message}</Text>
      {action ? <ActionButton label={action} variant={v.actionVariant} onPress={onAction} style={s.action} /> : null}
    </View>
  );
}
