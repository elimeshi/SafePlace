import * as React from 'react';

export interface SystemNoticeProps {
  tone?: 'info' | 'warning' | 'danger';
  title?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  style?: React.CSSProperties;
}

/**
 * Neutral factual message block — the women-detected upload alert (§4.4.2)
 * and Settings dangerous-zone confirmations (§3.6 / §4).
 */
export function SystemNotice(props: SystemNoticeProps): JSX.Element;
