const BASE = "https://poe.ninja/poe1/api/economy";
const UA = "poe-beast-prices/0.1 (personal price browser; maxikie02@gmail.com)";

// poe.ninja refreshes PoE1 overviews roughly every 15 minutes, but beast prices
// do not move fast enough to be worth checking that often.
const REVALIDATE = 3600;

export type League = { id: string; name: string };

export type Beast = {
  id: number;
  name: string;
  icon?: string;
  /** "Goliaths|Unnaturals|The Wilds" — genus|family|habitat. Missing on some lines. */
  baseType?: string;
  chaosValue: number;
  divineValue: number;
  exaltedValue?: number;
  count: number;
  listingCount: number;
  detailsId: string;
  sparkLine?: { totalChange: number };
};

async function ninja<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`poe.ninja ${path} -> ${res.status}`);
  return res.json();
}

export function getLeagues() {
  return ninja<League[]>("/leagues");
}

export async function getBeasts(league: string) {
  const data = await ninja<{ lines: Beast[] }>(
    `/stash/current/item/overview?league=${encodeURIComponent(league)}&type=Beast`,
  );
  return data.lines;
}

type TradeItemData = {
  result: { label: string; entries: { type?: string; name?: string }[] }[];
};

/**
 * Every beast the trade site knows, priced or not. poe.ninja only lists beasts
 * with current listings (218 of them), while GGG's own item data has 361 — and
 * a search pattern has to account for the ones nobody is selling too, or it
 * matches them by accident.
 *
 * Randomly named rare beasts are in neither list: their names are generated per
 * capture, so nothing can enumerate them ahead of time.
 */
export async function getAllBeastNames() {
  const res = await fetch("https://www.pathofexile.com/api/trade/data/items", {
    headers: { "User-Agent": UA },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`trade/data/items -> ${res.status}`);

  const data: TradeItemData = await res.json();
  const monsters = data.result.find((g) => g.label === "Itemised Monsters");
  return (monsters?.entries ?? [])
    .map((e) => e.name ?? e.type ?? "")
    .filter(Boolean);
}
