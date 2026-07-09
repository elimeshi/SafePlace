import React from 'react';

/**
 * Safe-Place checkbox — used for the single terms-of-service consent on
 * onboarding step 2 (spec §6.2.2). Label may contain links.
 */
export function Checkbox({ checked = false, onChange, disabled = false, id, children, style }) {
  const reactId = React.useId();
  const boxId = id || reactId;
  return (
    <label
      htmlFor={boxId}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
      }}
    >
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        role="checkbox" aria-checked={checked} id={boxId}
        style={{
          flex: '0 0 auto', marginTop: 1,
          width: 22, height: 22,
          display: 'grid', placeItems: 'center',
          borderRadius: 'var(--radius-sm)',
          border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--color-primary)' : 'var(--white)',
          color: 'var(--white)',
          font: 'var(--weight-bold) 13px/1 var(--font-sans)',
          transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span style={{ font: 'var(--type-meta)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {children}
      </span>
    </label>
  );
}
