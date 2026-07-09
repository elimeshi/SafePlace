import * as React from 'react';

export interface ToggleProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** Onboarding step 3 shows defaults as read-only switches (spec §6.2.3). */
  readOnly?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  style?: React.CSSProperties;
}

/** Switch for filter defaults (read-only) and Settings (interactive). */
export function Toggle(props: ToggleProps): JSX.Element;
