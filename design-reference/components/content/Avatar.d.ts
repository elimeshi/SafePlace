import * as React from 'react';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  /** Colored ring = unseen status in the stories rail (feed-spec §2.1.2). */
  ring?: boolean;
  ringColor?: string;
  style?: React.CSSProperties;
}

/** Round profile image with initial fallback and optional status ring. */
export function Avatar(props: AvatarProps): JSX.Element;
