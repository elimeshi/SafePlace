import * as React from 'react';
import type { SourceLabelProps } from '../content/SourceLabel';

export interface PostAuthor { name?: string; avatar?: string; }
export interface Post {
  author?: PostAuthor;
  time?: string;
  source?: SourceLabelProps;
  body?: React.ReactNode;
  media?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  saved?: boolean;
}

export interface PostCardProps {
  post?: Post;
  /** Render the modest filtered-media placeholder (UI defense-in-depth). */
  filtered?: boolean;
  style?: React.CSSProperties;
}

/**
 * The core feed card — "Facebook-lite" self-contained post unit.
 * @startingPoint section="Surfaces" subtitle="Feed post card with source label" viewport="640x560"
 */
export function PostCard(props: PostCardProps): JSX.Element;
