/**
 * The astrolabes, and what one costs.
 *
 * poe.ninja does not price them: they are absent from every one of its
 * overviews, exchange and stash alike. GGG's own trade data is the only place
 * that knows they exist, so they are priced the way the unlisted beasts are,
 * by asking the trade site and keeping the answer in the cache. See
 * src/lib/trade-prices.ts for why that never happens during a render.
 */

// Explicit extension: Node's test runner resolves this file directly.
import { getTradePrices, type TradePrice } from "./trade-prices.ts";

/**
 * All ten, as GGG's `api/trade/data/items` spells them. The order is that
 * file's own, which is neither alphabetical nor by price, so the interface
 * sorts them itself.
 */
export const ASTROLABES: readonly string[] = [
  "Lightless Astrolabe",
  "Fungal Astrolabe",
  "Grasping Astrolabe",
  "Deceptive Astrolabe",
  "Runic Astrolabe",
  "Templar Astrolabe",
  "Fruiting Astrolabe",
  "Timeless Astrolabe",
  "Nameless Astrolabe",
  "Chaotic Astrolabe",
];

export type PricedAstrolabe = {
  name: string;
  /** Cheapest listing in chaos. Zero when nobody is selling one. */
  chaosValue: number;
  /** When the trade site was last asked, so the panel can say how stale it is. */
  checkedAt?: string;
};

/**
 * Every astrolabe with whatever price is known for it, cheapest first.
 *
 * One with no price at all still appears. Leaving it out would read as "this
 * astrolabe does not exist", when what happened is that the cron has not
 * reached it yet.
 */
export async function getAstrolabePrices(
  league: string,
): Promise<PricedAstrolabe[]> {
  let prices: Map<string, TradePrice>;
  try {
    prices = await getTradePrices(league, [...ASTROLABES]);
  } catch {
    prices = new Map();
  }

  return ASTROLABES.map((name) => ({
    name,
    chaosValue: prices.get(name)?.chaosValue ?? 0,
    checkedAt: prices.get(name)?.checkedAt,
  })).sort((a, b) => a.chaosValue - b.chaosValue || a.name.localeCompare(b.name));
}
