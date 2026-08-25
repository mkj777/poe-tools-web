/**
 * Whole minutes from `now` until `due`, rounded up so a countdown reads the
 * way a wait feels: thirty seconds left is still "1 min". Never negative,
 * because a page that is past due is not late, it is simply ready to rebuild.
 */
export function minutesUntil(due: number, now: number) {
  return Math.max(0, Math.ceil((due - now) / 60_000));
}

/**
 * The moment this page was put together. It lives here, behind a promise,
 * because a component body has to stay pure and reading the clock is not: a
 * page built once and served from the CDN calls this exactly once, which is
 * precisely the moment the countdown counts from.
 */
export async function renderedAt() {
  return Date.now();
}
