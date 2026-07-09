import * as React from 'react';
import type { IconName } from './Icon';

export interface SourceLabelProps {
  kind?: 'group' | 'public' | 'suggested';
  /** Group name (kind="group"). */
  name?: string;
  /** Group color from the group palette (kind="group"). */
  color?: string;
  icon?: IconName;
  style?: React.CSSProperties;
}

/**
 * The colored provenance tag under a poster's name (feed-spec §2.3.5).
 * @startingPoint section="Content" subtitle="Colored post-source tags" viewport="700x120"
 */
export function SourceLabel(props: SourceLabelProps): JSX.Element;
