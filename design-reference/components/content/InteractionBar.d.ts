import * as React from 'react';

export interface InteractionBarProps {
  likes?: number;
  comments?: number;
  liked?: boolean;
  saved?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  style?: React.CSSProperties;
}

/** Restrained like/comment/share/save row for a post card (feed-spec §4.1). */
export function InteractionBar(props: InteractionBarProps): JSX.Element;
