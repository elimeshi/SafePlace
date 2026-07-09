import React from 'react';
import { Avatar } from '../content/Avatar.jsx';
import { SourceLabel } from '../content/SourceLabel.jsx';
import { InteractionBar } from '../content/InteractionBar.jsx';
import { Icon } from '../content/Icon.jsx';

/**
 * PostCard — the core feed unit. "Facebook-lite": a self-contained white
 * card with a subtle frame and breathing room around it (master §5.2.1,
 * feed-spec §4). Header (avatar + name + time + ⋯), colored source label,
 * body text, optional media, interaction row.
 *
 * `filtered` renders the modest placeholder state instead of the media —
 * the UI layer of the visibility system (CLAUDE.md invariant #2: UI is
 * defense-in-depth; real enforcement is server/DB-side).
 */
export function PostCard({ post = {}, filtered = false, style }) {
  const { author = {}, time = '', source, body, media, likes = 0, comments = 0, liked = false, saved = false } = post;

  return (
    <article
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        maxWidth: 'var(--feed-column)',
        ...style,
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', padding: 'var(--space-lg) var(--space-lg) var(--space-md)' }}>
        <Avatar src={author.avatar} name={author.name} size={44} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{author.name}</span>
            <span style={{ font: 'var(--type-meta)', color: 'var(--text-muted)' }}>· {time}</span>
          </div>
          {source && <SourceLabel {...source} style={{ alignSelf: 'flex-start' }} />}
        </div>
        <button type="button" aria-label="אפשרויות" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-md)' }}>
          <Icon name="more-horizontal" size={20} />
        </button>
      </header>

      {/* Body */}
      {body && (
        <div style={{ padding: '0 var(--space-lg) var(--space-md)', font: 'var(--type-body)', color: 'var(--text-primary)', lineHeight: 1.65 }}>
          {body}
        </div>
      )}

      {/* Media */}
      {media && !filtered && (
        <div style={{ background: 'var(--ink-050)' }}>
          <img src={media} alt="" style={{ display: 'block', width: '100%', maxHeight: 460, objectFit: 'cover' }} />
        </div>
      )}
      {media && filtered && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)',
            padding: 'var(--space-3xl) var(--space-lg)',
            background: 'repeating-linear-gradient(135deg, var(--blue-050), var(--blue-050) 12px, var(--surface-sunken) 12px, var(--surface-sunken) 24px)',
            color: 'var(--text-secondary)', textAlign: 'center',
          }}
        >
          <Icon name="eye" size={26} color="var(--blue-400)" />
          <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>מדיה מסוננת לפי ההעדפות שלך</span>
          <span style={{ font: 'var(--type-meta)', maxWidth: 320 }}>ניתן לשנות את העדפות הצריכה באזור האישי בכל עת.</span>
        </div>
      )}

      {/* Interactions */}
      <div style={{ padding: 'var(--space-sm) var(--space-md)', borderTop: '1px solid var(--ink-100)', marginTop: media ? 0 : 'var(--space-xs)' }}>
        <InteractionBar likes={likes} comments={comments} liked={liked} saved={saved} />
      </div>
    </article>
  );
}
