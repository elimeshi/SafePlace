import type { TextStyle, ViewStyle } from "react-native";
import type { IconName } from "../content/Icon";
import { theme } from "../theme";

/**
 * Pure styling for SystemNotice — kept separate from the view so it can be
 * unit-tested with vitest (no RN renderer). Ported from
 * design-reference/components/feedback/SystemNotice.jsx. A neutral, factual
 * message block; its signature use is the women-detected upload alert
 * (master spec §4.4.2) — informs, never blocks or preaches — and the
 * Settings dangerous-zone double-confirm flows (§3.6 / §4).
 */

export type NoticeTone = "info" | "warning" | "danger";

export interface NoticeToneStyle {
  bg: string;
  border: string;
  iconName: IconName;
  iconColor: string;
}

const TONES: Record<NoticeTone, NoticeToneStyle> = {
  info: {
    bg: theme.colors.blue050,
    border: theme.colors.blue200,
    iconName: "info",
    iconColor: theme.colors.primary,
  },
  warning: {
    bg: theme.colors.warningSoft,
    border: theme.colors.warning,
    iconName: "shield-check",
    iconColor: theme.colors.warning,
  },
  danger: {
    bg: theme.colors.dangerSoft,
    border: theme.colors.danger,
    iconName: "lock",
    iconColor: theme.colors.danger,
  },
};

/** Resolve the bg/border/icon for a given tone — the one piece of tone logic. */
export function resolveNoticeTone(tone: NoticeTone): NoticeToneStyle {
  return TONES[tone];
}

export interface NoticeStyle {
  container: ViewStyle;
  iconWrap: ViewStyle;
  column: ViewStyle;
  title: TextStyle;
  message: TextStyle;
  actionsRow: ViewStyle;
}

/**
 * Full layout for the notice block: leading icon, then a column of
 * optional title + message, then an optional action row of Buttons.
 * `flexDirection: "row"` mirrors correctly under the app's global RTL
 * bootstrap (ADR 0007) — no marginStart/End needed for a single gap.
 */
export function resolveNoticeStyle(tone: NoticeTone): NoticeStyle {
  const t = resolveNoticeTone(tone);
  return {
    container: {
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: t.bg,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: theme.radius.lg,
    },
    iconWrap: {
      marginTop: 2,
    },
    column: {
      flexDirection: "column",
      gap: theme.spacing.sm,
      flex: 1,
    },
    title: {
      ...theme.typeRole.bodyStrong,
      color: theme.colors.textPrimary,
    },
    message: {
      ...theme.typeRole.meta,
      color: theme.colors.textSecondary,
    },
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
  };
}
