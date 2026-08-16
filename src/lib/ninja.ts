import type { BeastRarity } from "./beast-rarity";

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
  /** Undefined only when neither poe.ninja nor the trade site could price it. */
  chaosValue?: number;
  divineValue?: number;
  exaltedValue?: number;
  count?: number;
  listingCount?: number;
  /** Absent for beasts poe.ninja has no page for. */
  detailsId?: string;
  sparkLine?: { totalChange: number };
  /** Where the price came from, for the table to explain itself. */
  source?: "ninja" | "trade";
  /** How it shows up on the minimap. Red beasts carry two mods and far more life. */
  rarity?: BeastRarity;
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

/**
 * The league as poe.ninja spells it in a URL. Not the API id: the site drops
 * everything but letters and turns the hardcore variant into a suffix, so
 * "Hardcore Allflame" is /allflamehc while plain "Hardcore" stays /hardcore.
 */
export function leagueSlug(league: string) {
  const hardcore = /^hardcore\s+/i.test(league);
  const base = league
    .replace(/^hardcore\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return hardcore ? `${base}hc` : base;
}

export async function getBeasts(league: string) {
  const data = await ninja<{ lines: Beast[] }>(
    `/stash/current/item/overview?league=${encodeURIComponent(league)}&type=Beast`,
  );
  return data.lines;
}

export type Scarab = {
  id: string;
  name: string;
  icon: string;
  /** Chaos each, from the currency exchange. */
  chaosValue: number;
};

/** The two scarabs that decide whether a beast run is worth setting up. */
const BESTIARY_SCARABS = [
  {
    id: "bestiary-scarab-of-duplicating",
    name: "Scarab of Duplicating",
    icon: "/duplicating_scarab.png",
  },
  {
    id: "bestiary-scarab-of-the-herd",
    name: "Scarab of the Herd",
    icon: "/herd_scarab.png",
  },
];

export async function getScarabPrices(league: string): Promise<Scarab[]> {
  const data = await ninja<{
    lines: { id: string; primaryValue: number }[];
    core: { primary: string };
  }>(
    `/exchange/current/overview?league=${encodeURIComponent(league)}&type=Scarab`,
  );

  // The exchange quotes in a primary currency; for PoE 1 that is chaos.
  const chaos = data.core?.primary === "chaos";
  const byId = new Map(data.lines.map((line) => [line.id, line.primaryValue]));

  return BESTIARY_SCARABS.flatMap((scarab) => {
    const value = byId.get(scarab.id);
    return value === undefined || !chaos ? [] : [{ ...scarab, chaosValue: value }];
  });
}

/** What one Divine Orb costs in chaos right now — the conversion everything
 *  else on the page is read against. */
export async function getDivinePrice(league: string) {
  const data = await ninja<{
    lines: { id: string; primaryValue: number }[];
    core: { primary: string };
  }>(
    `/exchange/current/overview?league=${encodeURIComponent(league)}&type=Currency`,
  );

  if (data.core?.primary !== "chaos") return undefined;
  return data.lines.find((line) => line.id === "divine")?.primaryValue;
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
