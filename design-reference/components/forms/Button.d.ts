import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = deep blue (default). cta = the one warm terracotta accent, reserved for the single key action per screen. */
  variant?: 'primary' | 'cta' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Idle breathing halo — only for the primary CTA of an onboarding step (spec §6.3.2). */
  halo?: boolean;
  block?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Primary interactive control for Safe-Place.
 * @startingPoint section="Forms" subtitle="Deep-blue and terracotta-accent buttons" viewport="700x160"
 */
export function Button(props: ButtonProps): JSX.Element;
