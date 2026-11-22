import { rarityOf } from "./beast-rarity.ts";
import type { Beast } from "./ninja.ts";
import type { TradePrice } from "./trade-prices.ts";

/**
 * The two leagues that never end. Since 3.30.0 Einhar no longer captures
 * yellow beasts ("Yellow beasts in your Maps are no longer captured by
 * Einhar"), and the ones already in a Menagerie were deleted. What still
 * trades are the itemised yellow beasts caught before the patch, and those
 * only exist where old items carry over: here.
 */
const PERMANENT_LEAGUES = new Set(["Standard", "Hardcore"]);

/** Whether yellow beasts can still turn up for sale in this league. */
export const keepsYellowBeasts = (league: string) =>
  PERMANENT_LEAGUES.has(league);

/**
 * Whether a beast can exist in this league at all. A challenge league starts
 * after 3.30, so only red beasts and bosses (which `rarityOf` counts as red)
 * can ever be caught in it.
 */
export const existsIn = (league: string, name: string) =>
  keepsYellowBeasts(league) || rarityOf(name) === "red";

/**
 * The beast list, put together from what poe.ninja prices and the names the
 * trade site knows. Pure, so it can be tested without either; `loadBeasts`
 * does the fetching.
 */
export function assembleBeasts(
  league: string,
  priced: Beast[],
  allNames: string[],
  tradePrices: (missing: string[]) => Map<string, TradePrice>,
): Beast[] {
  // What poe.ninja prices is on sale in this league, which proves it exists
  // there whatever the rarity list says: a red beast the wiki has not caught
  // up with, or a yellow one still caught somewhere other than a map. Only the
  // names nobody is selling are filtered, since those are a guess.
  const known = new Set(priced.map((b) => b.name));
  const missing = allNames
    .filter((name) => !known.has(name) && existsIn(league, name))
    .sort();
  const prices = tradePrices(missing);

  return [
    ...priced.map((b) => ({
      ...b,
      source: "ninja" as const,
      rarity: rarityOf(b.name),
    })),
    ...missing.map((name, i) => {
      const price = prices.get(name);
      return {
        id: -(i + 1),
        name,
        chaosValue: price?.chaosValue,
        listingCount: price?.listingCount ?? 0,
        source: "trade" as const,
        rarity: rarityOf(name),
      };
    }),
  ];
}
