const BASE = "https://poe.ninja/poe1/api/economy";
const UA = "poe-beast-prices/0.1 (personal price browser; maxikie02@gmail.com)";

// poe.ninja refreshes PoE1 overviews roughly every 15 minutes and asks callers
// not to poll faster than that.
const REVALIDATE = 900;

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
