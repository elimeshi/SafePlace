import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * InteractionBar — the minimal action row at the bottom of a post card
 * (feed-spec §4.1, master §5.2.2). Deliberately restrained: like, comment,
 * share, save. No public like COUNT pressure beyond a quiet number
 * (CLAUDE.md §8 — no social-pressure UI). RTL: actions read right-to-left.
 */
export function InteractionBar({ likes = 0, comments = 0, liked = false, saved = false, onLike, onComment, onShare, onSave, style }) {
  const Action = ({ icon, label, count, active, activeColor, onClick }) => {
    const [hover, setHover] = React.useState(false);
    return (
      <button
        type="button" onClick={onClick}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        aria-label={label}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 10px', minHeight: 40,
          background: hover ? 'var(--surface-sunken)' : 'transparent',
          border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          color: active ? (activeColor || 'var(--color-primary)') : 'var(--text-secondary)',
          font: 'var(--type-meta)',
          transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
        }}
      >
        <Icon name={icon} size={20} style={active && icon === 'heart' ? { fill: 'currentColor' } : undefined} />
        {count != null && count > 0 && <span className="sp-numeric">{count}</span>}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...style }}>
      <Action icon="heart" label="לייק" count={likes} active={liked} activeColor="var(--danger)" onClick={onLike} />
      <Action icon="comment" label="תגובה" count={comments} onClick={onComment} />
      <Action icon="share" label="שיתוף" onClick={onShare} />
      <div style={{ flex: 1 }} />
      <Action icon="bookmark" label="שמירה" active={saved} onClick={onSave} />
    </div>
  );
}
