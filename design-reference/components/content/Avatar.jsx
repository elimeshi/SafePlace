import React from 'react';

/**
 * Avatar. Round profile image. Optional colored ring = an unseen status
 * in the stories rail (feed-spec §2.1.2 — ring disappears once viewed).
 * Falls back to an initial on a soft blue tint when no image.
 */
export function Avatar({ src, name = '', size = 44, ring = false, ringColor, style }) {
  const initial = name.trim().charAt(0) || '·';
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.06)) : 0;
  const pad = ring ? Math.max(2, Math.round(size * 0.05)) : 0;
  const inner = size - (ringWidth + pad) * 2;

  const img = (
    <span
      style={{
        width: ring ? inner : size, height: ring ? inner : size,
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        display: 'grid', placeItems: 'center',
        background: 'var(--blue-100)',
        color: 'var(--blue-700)',
        font: `var(--weight-semibold) ${Math.round((ring ? inner : size) * 0.42)}px/1 var(--font-sans)`,
        flex: '0 0 auto',
      }}
    >
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </span>
  );

  if (!ring) return React.cloneElement(img, { style: { ...img.props.style, ...style } });

  return (
    <span
      style={{
        display: 'grid', placeItems: 'center',
        width: size, height: size, borderRadius: 'var(--radius-full)',
        padding: pad,
        background: `linear-gradient(135deg, ${ringColor || 'var(--color-accent)'}, var(--blue-400))`,
        flex: '0 0 auto',
        ...style,
      }}
    >
      <span style={{ padding: ringWidth, borderRadius: 'var(--radius-full)', background: 'var(--white)', display: 'grid', placeItems: 'center' }}>
        {img}
      </span>
    </span>
  );
}
