import React from 'react';

/**
 * Safe-Place Button.
 * Primary = deep blue by default; the ONE warm terracotta accent is
 * reserved for the single most important CTA per screen (spec §6.3.5),
 * exposed as variant="cta" with an optional idle breathing halo (§6.3.2).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  halo = false,
  block = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  children,
  ...rest
}) {
  const sizes = {
    sm: { padding: '8px 16px', font: 'var(--text-sm)', radius: 'var(--radius-md)', minH: 36 },
    md: { padding: '11px 22px', font: 'var(--text-base)', radius: 'var(--radius-md)', minH: 44 },
    lg: { padding: '15px 28px', font: 'var(--text-lg)', radius: 'var(--radius-lg)', minH: 52 },
  }[size];

  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--text-on-primary)',
      border: '1px solid transparent',
      '--hover-bg': 'var(--color-primary-hover)',
      '--active-bg': 'var(--color-primary-active)',
    },
    cta: {
      background: 'var(--color-accent)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
      '--hover-bg': 'var(--color-accent-hover)',
      '--active-bg': 'var(--color-accent-active)',
    },
    secondary: {
      background: 'var(--white)',
      color: 'var(--color-primary)',
      border: '1px solid var(--border-strong)',
      '--hover-bg': 'var(--surface-sunken)',
      '--active-bg': 'var(--blue-100)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid transparent',
      '--hover-bg': 'var(--surface-sunken)',
      '--active-bg': 'var(--blue-100)',
    },
    danger: {
      background: 'var(--white)',
      color: 'var(--danger)',
      border: '1px solid var(--danger)',
      '--hover-bg': 'var(--danger-050)',
      '--active-bg': '#f6dcdc',
    },
  }[variant];

  const [state, setState] = React.useState('rest');
  const bg = disabled ? undefined
    : state === 'active' ? variants['--active-bg']
    : state === 'hover' ? variants['--hover-bg']
    : variants.background;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setState('hover')}
      onMouseLeave={() => setState('rest')}
      onMouseDown={() => setState('active')}
      onMouseUp={() => setState('hover')}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-sm)',
        minHeight: sizes.minH,
        padding: sizes.padding,
        font: `var(--weight-semibold) ${sizes.font}/1 var(--font-sans)`,
        letterSpacing: 'var(--tracking-label)',
        borderRadius: sizes.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: state === 'active' && !disabled ? 'scale(var(--press-scale))' : 'scale(1)',
        transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)',
        animation: halo && !disabled ? 'sp-cta-halo var(--cta-halo-cycle) var(--ease-standard) infinite' : undefined,
        ...variants,
        background: bg,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
