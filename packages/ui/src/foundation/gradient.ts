export interface GradientVector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Start/end points (in box pixels) that reproduce a CSS `linear-gradient(<angle>deg, …)`
 * on a `width`×`height` box: the gradient line passes through the centre and
 * its length is |w·sin a| + |h·cos a|, so the corners land exactly on 0%/100%.
 */
export function cssGradientVector(angleDeg: number, width: number, height: number): GradientVector {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(width * dx) + Math.abs(height * dy);
  const cx = width / 2;
  const cy = height / 2;
  return {
    x1: cx - (dx * len) / 2,
    y1: cy - (dy * len) / 2,
    x2: cx + (dx * len) / 2,
    y2: cy + (dy * len) / 2,
  };
}
