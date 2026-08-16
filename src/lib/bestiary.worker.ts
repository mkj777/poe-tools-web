/**
 * Solves the pattern off the main thread.
 *
 * Set cover over 361 beasts, each fragment checked against the modifier text
 * and 35,237 possible generated names, takes over a second. Run inline it
 * froze the page on every keystroke in the threshold field — and no amount of
 * `useDeferredValue` helps, since React cannot interrupt one long synchronous
 * `useMemo`. Here it just occupies a worker while the page stays live.
 */
import {
  buildBestiaryRegex,
  matchesBestiaryPattern,
  type BeastEntry,
} from "./bestiary-regex.ts";

export type SolveRequest = {
  id: number;
  wanted: BeastEntry[];
  unwanted: BeastEntry[];
};

export type SolveResponse = {
  id: number;
  pattern: string | null;
  overmatched: string[];
  missing: string[];
};

const rowOf = (entry: BeastEntry) => [entry.name, ...(entry.lines ?? [])];

self.onmessage = ({ data }: MessageEvent<SolveRequest>) => {
  const { id, wanted, unwanted } = data;
  const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted);

  const missing = pattern
    ? wanted
        .filter((entry) => !matchesBestiaryPattern(pattern, rowOf(entry)))
        .map((entry) => entry.name)
    : wanted.map((entry) => entry.name);

  self.postMessage({ id, pattern, overmatched, missing } satisfies SolveResponse);
};
