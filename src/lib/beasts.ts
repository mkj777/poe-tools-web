import { getAllBeastNames, getBeasts, type Beast } from "./ninja";
import { getTradePrices } from "./trade-prices";
import { rarityOf } from "./beast-rarity";

/**
 * Every beast for a league, priced wherever a price exists.
 *
 * poe.ninja only lists what somebody is currently selling. The rest come from
 * the committed trade snapshot, and no listing at all means the game no longer
 * hands the beast out: those keep an undefined value so the UI can say so
 * instead of pricing them at zero.
 */
export async function loadBeasts(league: string): Promise<Beast[]> {
  const [priced, allNames] = await Promise.all([
    getBeasts(league),
    getAllBeastNames().catch(() => [] as string[]),
  ]);

  const known = new Set(priced.map((b) => b.name));
  const missing = allNames.filter((name) => !known.has(name)).sort();
  const tradePrices = getTradePrices(league, missing);

  return [
    ...priced.map((b) => ({
      ...b,
      source: "ninja" as const,
      rarity: rarityOf(b.name),
    })),
    ...missing.map((name, i) => {
      const price = tradePrices.get(name);
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

/** Anything the game still drops has someone selling it. */
export const hasListing = (beast: Beast) =>
  beast.source === "ninja" || Boolean(beast.listingCount);
