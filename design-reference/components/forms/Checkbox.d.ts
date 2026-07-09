import * as React from 'react';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Consent checkbox — terms of service on onboarding step 2 (spec §6.2.2). */
export function Checkbox(props: CheckboxProps): JSX.Element;
