/**
 * How many Threads one map takes. 3.30.0: "For each Thread expended, up to a
 * maximum of eight, there are also increasingly higher and higher chances to
 * apply powerful randomised transformative effects to the area."
 */
export const MIN_THREADS = 1;
export const MAX_THREADS = 8;

/**
 * The count a typed value stands for. The field keeps what was typed, so an
 * empty one can be retyped, while the total always reads a real count: the
 * default of one for anything that is not a number, the nearest bound for one
 * out of range.
 */
export function threadCount(typed: string): number {
  const n = Number.parseInt(typed, 10);
  if (!Number.isFinite(n)) return MIN_THREADS;
  return Math.min(MAX_THREADS, Math.max(MIN_THREADS, n));
}
