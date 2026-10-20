/** Scroll thresholds for the feed's collapse-on-scroll (01 §6) and follow rail (01 §6.4). */
export const COLLAPSE_AT = 24;
/** The follow rail appears once the viewer is within this many posts of the end. */
export const FOLLOW_RAIL_THRESHOLD = 3;

/** Collapse once scrolling has clearly started; re-expand only at the very top (hysteresis between). */
export function nextCollapsed(prev: boolean, y: number): boolean {
  if (y <= 0) return false;
  if (y > COLLAPSE_AT) return true;
  return prev;
}

export function shouldShowFollowRail(p: {
  lastVisibleIndex: number;
  count: number;
  dismissed: boolean;
  hasSuggestions: boolean;
}): boolean {
  if (p.dismissed || !p.hasSuggestions || p.count === 0) return false;
  return p.lastVisibleIndex >= p.count - FOLLOW_RAIL_THRESHOLD;
}
