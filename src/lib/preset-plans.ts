import { unstable_cache } from "next/cache";
import {
  planBestiaryPatterns,
  type BeastEntry,
  type BestiaryPlan,
} from "./bestiary-regex";
import { hasListing } from "./beasts";
import type { Beast } from "./ninja";

/** The thresholds the buttons offer, and the only ones worth precomputing. */
export const PRESET_THRESHOLDS = [1, 2, 3, 4, 5];

/**
 * The four plans a threshold has. `sell` and `trash` are the two modes; `clear`
 * is the short pattern that removes what the sell search would otherwise drag
 * in, and `band` selects the beasts worth exactly this much.
 */
export type PlanMode = "sell" | "trash" | "clear" | "band";
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

type Split = {
  threshold: number;
  above: BeastEntry[];
  below: BeastEntry[];
  /** Worth this many chaos and not the next one up — 3c means 3.00 to 3.99. */
  band: BeastEntry[];
};

/** The beasts a threshold calls "3c", as opposed to "3c and up". */
export const inBand = (value: number, threshold: number) =>
  value >= threshold && value < threshold + 1;

/**
 * How many beasts have to sit at exactly the threshold before they are worth a
 * bulk step of their own. Under this they just ride along with the sell search,
 * which then starts at the threshold rather than one chaos above it.
 */
export const BAND_MIN = 10;

/**
 * What the plans actually depend on: which beasts fall on each side of each
 * preset, never the prices themselves. Prices move every quarter of an hour,
 * but a beast only rarely crosses 1, 2, 3, 4 or 5 chaos — so keying the cache
 * on the split rather than on the prices turns most refreshes into a cache hit.
 */
export function presetSplits(beasts: Beast[]): Split[] {
  // hasListing is the same cut the table makes. Without it the 142 beasts the
  // game no longer hands out come in at their snapshot price of 0 and fill the
  // trash plans with fragments for beasts that cannot turn up: at 3c that is
  // four searches for 174 beasts instead of one for 35.
  const priced = beasts.filter(
    (b) => hasListing(b) && b.chaosValue !== undefined,
  );
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
    band: priced
      .filter((b) => inBand(b.chaosValue!, threshold))
      .map(entry)
      .sort(byName),
  }));
}

function build(splits: Split[]): PresetPlans {
  const plans: PresetPlans = {};
  for (const { threshold, above, below, band } of splits) {
    // A big pile at exactly the threshold is bulk sold in a step of its own, so
    // the sell search above it starts one chaos higher. A small one is not
    // worth the extra search and stays inside the sell search.
    const banded = band.length >= BAND_MIN;
    const inside = new Set(band.map((b) => b.name));
    const wanted = banded ? above.filter((b) => !inside.has(b.name)) : above;
    const unwanted = banded ? [...below, ...band] : below;

    // Selling wants coverage, trashing wants no false positive ever.
    const sell = planBestiaryPatterns(wanted, unwanted, { exact: false });
    plans[presetKey(threshold, "sell")] = sell;
    plans[presetKey(threshold, "trash")] = planBestiaryPatterns(below, above, {
      exact: true,
    });

    // What the sell search drags in from under the threshold. Released first,
    // the sell search after it holds nothing but beasts worth keeping. Band
    // beasts it also picks up are keepers, so they are never in this pattern —
    // `above` is what it has to protect, and the band is part of it.
    const dragged = new Set(sell.falsePositives);
    plans[presetKey(threshold, "clear")] = planBestiaryPatterns(
      below.filter((b) => dragged.has(b.name)),
      above,
      { exact: true },
    );

    // Everything else has to stay out: the band is a price bracket, not a floor.
    if (banded) {
      plans[presetKey(threshold, "band")] = planBestiaryPatterns(
        band,
        [...above, ...below].filter((b) => !inside.has(b.name)),
        { exact: true },
      );
    }
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
  // The split alone does not say which plans were built from it, so the key
  // carries a version too: change what build() plans, change this, or the
  // cache keeps answering with the plans the old rules made.
  ["bestiary-preset-plans", "v2-band"],
  { revalidate: 900 },
);
