import React from 'react';
import { Icon } from '../content/Icon.jsx';
import { Button } from '../forms/Button.jsx';

/**
 * SystemNotice — a neutral, factual message block. Its defining use is the
 * upload alert when a man's media is classified as containing women
 * (master §3.5 / §4.4.2): "זוהו נשים במדיה שהעלית..." — NOT preachy, NOT
 * blocking, just informs and lets the user decide (אישור / חזרה).
 * Also used for the Settings dangerous-zone warnings (double-confirm flows).
 *
 * tones: info (neutral blue) · warning (dangerous-zone amber) · danger.
 */
export function SystemNotice({
  tone = 'info',
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  style,
}) {
  const tones = {
    info:    { bg: 'var(--surface-sunken)', border: 'var(--blue-200)', icon: 'info', iconColor: 'var(--color-primary)' },
    warning: { bg: 'var(--warning-050)', border: 'color-mix(in srgb, var(--warning) 35%, white)', icon: 'shield-check', iconColor: 'var(--warning)' },
    danger:  { bg: 'var(--danger-050)', border: 'color-mix(in srgb, var(--danger) 35%, white)', icon: 'lock', iconColor: 'var(--danger)' },
  }[tone];

  return (
    <div
      role="status"
      style={{
        display: 'flex', gap: 'var(--space-md)',
        padding: 'var(--space-lg)',
        background: tones.bg,
        border: `1px solid ${tones.border}`,
        borderRadius: 'var(--radius-lg)',
        ...style,
      }}
    >
      <Icon name={tones.icon} size={22} color={tones.iconColor} style={{ marginTop: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flex: 1 }}>
        {title && <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{title}</span>}
        {children && <span style={{ font: 'var(--type-meta)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</span>}
        {(confirmLabel || cancelLabel) && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            {confirmLabel && (
              <Button size="sm" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
            )}
            {cancelLabel && <Button size="sm" variant="secondary" onClick={onCancel}>{cancelLabel}</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
