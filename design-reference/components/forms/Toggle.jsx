import React from 'react';

/**
 * Safe-Place toggle switch. Used for the content-filter defaults display
 * (onboarding step 3 — READ-ONLY, spec §6.2.3) and in Settings (interactive).
 * Set readOnly for the onboarding "presentation of what was configured".
 */
export function Toggle({
  checked = false,
  onChange,
  readOnly = false,
  disabled = false,
  label,
  description,
  id,
  style,
}) {
  const reactId = React.useId();
  const switchId = id || reactId;
  const active = checked;

  const knob = (
    <span
      role={readOnly ? undefined : 'switch'}
      aria-checked={active}
      aria-readonly={readOnly || undefined}
      onClick={() => !readOnly && !disabled && onChange && onChange(!active)}
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: 46, height: 28,
        borderRadius: 'var(--radius-full)',
        background: active ? 'var(--color-primary)' : 'var(--ink-300)',
        cursor: readOnly || disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--dur-base) var(--ease-standard)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          right: active ? 3 : 21, /* RTL: on = knob to the right */
          width: 22, height: 22,
          borderRadius: 'var(--radius-full)',
          background: 'var(--white)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'right var(--dur-base) var(--ease-standard)',
        }}
      />
    </span>
  );

  if (!label) return knob;

  return (
    <label
      htmlFor={switchId}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
        cursor: readOnly || disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {knob}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{label}</span>
        {description && (
          <span style={{ font: 'var(--type-meta)', color: 'var(--text-secondary)' }}>{description}</span>
        )}
      </span>
    </label>
  );
}
