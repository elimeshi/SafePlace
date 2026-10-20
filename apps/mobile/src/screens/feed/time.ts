import { feedScreenCopy } from "./copy";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "לפני שעתיים" style label. Pure: `now` is injected. */
export function relativeTime(iso: string | null, now: number): string {
  const t = iso ? Date.parse(iso) : NaN;
  const c = feedScreenCopy.time;
  if (Number.isNaN(t)) return "";
  const d = Math.max(0, now - t);
  if (d < MIN) return c.now;
  if (d < HOUR) return c.minutes(Math.floor(d / MIN));
  if (d < 2 * HOUR) return c.hour;
  if (d < 3 * HOUR) return c.twoHours;
  if (d < DAY) return c.hours(Math.floor(d / HOUR));
  if (d < 2 * DAY) return c.yesterday;
  return c.days(Math.floor(d / DAY));
}
