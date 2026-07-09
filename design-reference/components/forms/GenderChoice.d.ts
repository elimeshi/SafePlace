import * as React from 'react';

export interface GenderOption { value: string; label: string; }

export interface GenderChoiceProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Defaults to גבר / אישה. */
  options?: GenderOption[];
  style?: React.CSSProperties;
}

/** The two large "door" gender buttons, onboarding step 2 (spec §6.2.2). */
export function GenderChoice(props: GenderChoiceProps): JSX.Element;
