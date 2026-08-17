import { unstable_cache } from "next/cache";
import {
  planBestiaryPatterns,
  type BeastEntry,
  type BestiaryPlan,
} from "./bestiary-regex";
import type { Beast } from "./ninja";

/** The thresholds the buttons offer, and the only ones worth precomputing. */
export const PRESET_THRESHOLDS = [1, 2, 3, 4, 5];

export type PlanMode = "sell" | "trash";
export type PresetPlans = Record<string, BestiaryPlan>;

export const presetKey = (threshold: number, mode: PlanMode) =>
  `${threshold}:${mode}`;

/**
 * Genus, family and habitat are separate lines of the Bestiary row, and `^`
 * binds to the start of any one of them. Beasts nobody has a listing for are
 * left out entirely: the game does not hand them out, so no search can turn one
 * up and there is nothing to protect them from.
 */
const entry = (beast: Beast): BeastEntry => ({
  name: beast.name,
  lines: (beast.baseType ?? "").split("|").filter(Boolean),
});

type Split = { threshold: number; above: BeastEntry[]; below: BeastEntry[] };

/**
 * What the plans actually depend on: which beasts fall on each side of each
 * preset, never the prices themselves. Prices move every quarter of an hour,
 * but a beast only rarely crosses 1, 2, 3, 5 or 9 chaos — so keying the cache
 * on the split rather than on the prices turns most refreshes into a cache hit.
 */
export function presetSplits(beasts: Beast[]): Split[] {
  const priced = beasts.filter((b) => b.chaosValue !== undefined);
  const byName = (a: BeastEntry, b: BeastEntry) => a.name.localeCompare(b.name);

  return PRESET_THRESHOLDS.map((threshold) => ({
    threshold,
    above: priced
      .filter((b) => b.chaosValue! >= threshold)
      .map(entry)
      .sort(byName),
    below: priced
      .filter((b) => b.chaosValue! < threshold)
      .map(entry)
      .sort(byName),
  }));
}

function build(splits: Split[]): PresetPlans {
  const plans: PresetPlans = {};
  for (const { threshold, above, below } of splits) {
    // Selling wants coverage, trashing wants no false positive ever.
    plans[presetKey(threshold, "sell")] = planBestiaryPatterns(above, below, {
      exact: false,
    });
    plans[presetKey(threshold, "trash")] = planBestiaryPatterns(below, above, {
      exact: true,
    });
  }
  return plans;
}

/**
 * The ten preset plans, computed once and reused until the splits change.
 *
 * Planning all ten takes a few seconds, which is far too long to make a visitor
 * wait for and far too long to redo on every render. `unstable_cache` keys on
 * the argument, so an unchanged split is served straight from Next's data cache
 * — shared between requests and instances, not just within one process. The
 * revalidate window matches the one the prices are fetched on; the split key is
 * what actually decides, so a refresh that moves no beast past a preset costs
 * nothing at all.
 */
export const getPresetPlans = unstable_cache(
  async (splits: Split[]) => build(splits),
  ["bestiary-preset-plans"],
  { revalidate: 900 },
);
