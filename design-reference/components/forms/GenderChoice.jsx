import React from 'react';

/**
 * Gender selection — the two large "door" buttons from onboarding step 2
 * (spec §6.2.2 / §6.3.2). Presented NEUTRALLY: no loaded explanation here,
 * the meaning is deferred to step 3. On hover: soft grey fill. On select:
 * emphasized border + thickened background — "pressing a door", not
 * "ticking a form option". Fully symmetric — same treatment for both.
 */
export function GenderChoice({ value, onChange, options, style }) {
  const opts = options || [
    { value: 'male', label: 'גבר' },
    { value: 'female', label: 'אישה' },
  ];
  const [hover, setHover] = React.useState(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', ...style }}>
      {opts.map((opt) => {
        const selected = value === opt.value;
        const isHover = hover === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange && onChange(opt.value)}
            onMouseEnter={() => setHover(opt.value)}
            onMouseLeave={() => setHover(null)}
            aria-pressed={selected}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--space-sm)',
              minHeight: 108,
              padding: 'var(--space-xl)',
              font: 'var(--weight-semibold) var(--text-xl)/1 var(--font-display)',
              color: selected ? 'var(--color-primary)' : 'var(--text-primary)',
              background: selected ? 'var(--blue-050)' : isHover ? 'var(--ink-050)' : 'var(--white)',
              border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
