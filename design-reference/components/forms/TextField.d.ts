import * as React from 'react';

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /** Shows the small success check at the field end. */
  valid?: boolean;
  error?: string;
}

/** Floating-label text input, RTL-first (spec §6.3.2). */
export function TextField(props: TextFieldProps): JSX.Element;
