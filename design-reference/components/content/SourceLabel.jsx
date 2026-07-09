import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * SourceLabel — the small colored tag under a poster's name that tells you,
 * at a glance, where a post comes from (feed-spec §2.3.4–2.3.5, §4.2).
 * ~20px tall, rounded, generous padding, SOFT color fill (never full
 * saturation). Three kinds:
 *   - group      → group color + icon + group name
 *   - public     → neutral slate-blue "פוסט ציבורי", no icon
 *   - suggested  → warm amber "מוצע עבורך"
 */
export function SourceLabel({ kind = 'group', name, color, icon = 'users', style }) {
  const config = {
    group: {
      text: name || 'קבוצה',
      bg: 'color-mix(in srgb, ' + (color || 'var(--group-blue)') + ' 16%, white)',
      fg: 'color-mix(in srgb, ' + (color || 'var(--group-blue)') + ' 78%, black)',
      showIcon: true,
    },
    public: {
      text: 'פוסט ציבורי',
      bg: 'color-mix(in srgb, var(--label-neutral) 18%, white)',
      fg: 'color-mix(in srgb, var(--label-neutral) 82%, black)',
      showIcon: false,
    },
    suggested: {
      text: 'מוצע עבורך',
      bg: 'color-mix(in srgb, var(--label-suggested) 20%, white)',
      fg: 'color-mix(in srgb, var(--label-suggested) 80%, black)',
      showIcon: false,
    },
  }[kind];

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 22, padding: '0 10px',
        borderRadius: 'var(--radius-md)',
        background: config.bg, color: config.fg,
        font: 'var(--type-label)', whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {config.showIcon && <Icon name={icon} size={13} strokeWidth={2.4} />}
      {config.text}
    </span>
  );
}
