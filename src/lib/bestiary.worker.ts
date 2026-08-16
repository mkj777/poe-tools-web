/**
 * Plans the searches off the main thread.
 *
 * Set cover over hundreds of beasts, each fragment checked against the modifier
 * text and 35,237 possible generated names, takes over a second. Run inline it
 * froze the page on every keystroke in the threshold field — and no amount of
 * `useDeferredValue` helps, since React cannot interrupt one long synchronous
 * `useMemo`. Here it just occupies a worker while the page stays live.
 */
import {
  planBestiaryPatterns,
  type BeastEntry,
  type BestiaryPlan,
} from "./bestiary-regex.ts";

export type SolveRequest = {
  id: number;
  wanted: BeastEntry[];
  unwanted: BeastEntry[];
};

export type SolveResponse = BestiaryPlan & { id: number };

self.onmessage = ({ data }: MessageEvent<SolveRequest>) => {
  const { id, wanted, unwanted } = data;
  const plan = planBestiaryPatterns(wanted, unwanted);
  self.postMessage({ id, ...plan } satisfies SolveResponse);
};
