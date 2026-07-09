import React from 'react';

/**
 * Safe-Place text field with floating label (spec §6.3.2).
 * On focus: thin accent-colored border + the label rises and shrinks.
 * On valid entry: a small check appears at the field's end (start side in RTL).
 * RTL-first.
 */
export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  valid = false,
  error,
  id,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const fieldId = id || reactId;
  const floated = focused || (value != null && String(value).length > 0);
  const borderColor = error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      <div style={{ position: 'relative' }}>
        <label
          htmlFor={fieldId}
          style={{
            position: 'absolute',
            right: 14,
            top: floated ? 8 : '50%',
            transform: floated ? 'translateY(0)' : 'translateY(-50%)',
            font: floated ? 'var(--type-label)' : 'var(--type-body)',
            color: error ? 'var(--danger)' : focused ? 'var(--color-primary)' : 'var(--text-muted)',
            pointerEvents: 'none',
            transition: 'all var(--dur-fast) var(--ease-standard)',
          }}
        >
          {label}
        </label>
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            minHeight: 56,
            padding: floated ? '24px 14px 8px' : '16px 14px',
            font: 'var(--type-body)',
            color: 'var(--text-primary)',
            background: 'var(--white)',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            boxShadow: focused ? 'var(--shadow-focus)' : 'none',
            transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
          }}
          {...rest}
        />
        {valid && !error && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 20, height: 20,
              display: 'grid', placeItems: 'center',
              borderRadius: 'var(--radius-full)',
              background: 'var(--success)', color: 'var(--white)',
              font: 'var(--weight-bold) 12px/1 var(--font-sans)',
            }}
          >
            ✓
          </span>
        )}
      </div>
      {error && (
        <span style={{ font: 'var(--type-meta)', color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
}
