/** Whole minutes since `then`, never negative: a clock ahead reads as now. */
export function minutesSince(then: number, now: number) {
  return Math.max(0, Math.floor((now - then) / 60_000));
}

/**
 * How long ago that many minutes is, in words. Prices are refetched every
 * quarter of an hour, so the hours are only ever reached when something has
 * gone wrong upstream, which is exactly when the number should be legible.
 */
export function ago(minutes: number) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min ago` : `${hours} h ago`;
}
