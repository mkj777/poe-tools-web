import { getAllBeastNames, getBeasts, type Beast } from "./ninja.ts";
import { getTradePrices } from "./trade-prices.ts";
import { assembleBeasts } from "./beast-list.ts";

/**
 * Every beast for a league, priced wherever a price exists.
 *
 * poe.ninja only lists what somebody is currently selling. The rest come from
 * the committed trade snapshot, and no listing at all means the game no longer
 * hands the beast out: those keep an undefined value so the UI can say so
 * instead of pricing them at zero.
 *
 * Outside Standard and Hardcore only red beasts and bosses are kept, see
 * beast-list.ts: a yellow beast cannot be caught in a league that started
 * after 3.30, so it has no row to fill.
 */
export async function loadBeasts(league: string): Promise<Beast[]> {
  const [priced, allNames] = await Promise.all([
    getBeasts(league),
    getAllBeastNames().catch(() => [] as string[]),
  ]);

  return assembleBeasts(league, priced, allNames, (missing) =>
    getTradePrices(league, missing),
  );
}

/** Anything the game still drops has someone selling it. */
export const hasListing = (beast: Beast) =>
  beast.source === "ninja" || Boolean(beast.listingCount);
