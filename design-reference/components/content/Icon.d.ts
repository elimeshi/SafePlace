import * as React from 'react';

export type IconName =
  | 'plus' | 'more-horizontal' | 'heart' | 'comment' | 'share' | 'bookmark'
  | 'chevron-down' | 'chevron-left' | 'arrow-left' | 'search' | 'bell' | 'home'
  | 'user' | 'users' | 'image' | 'poll' | 'map-pin' | 'tag' | 'shield-check'
  | 'lock' | 'eye' | 'x' | 'check' | 'settings' | 'info';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/** Curated Lucide outline glyph (repo ships no icon set — Lucide is the flagged substitution). */
export function Icon(props: IconProps): JSX.Element;
export const ICON_NAMES: IconName[];
