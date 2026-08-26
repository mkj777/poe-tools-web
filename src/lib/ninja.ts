import type { BeastRarity } from "./beast-rarity";

const BASE = "https://poe.ninja/poe1/api/economy";
const UA = "poe-tools-web/0.1 (personal price browser; maxikie02@gmail.com)";

// poe.ninja recomputes its PoE1 overviews roughly every 15 minutes, so that is
// the interval: anything shorter re-fetches numbers that have not changed yet.
const REVALIDATE = 900;

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

function ninjaResponse(path: string) {
  return fetch(`${BASE}${path}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: REVALIDATE },
  });
}

async function ninja<T>(path: string): Promise<T> {
  const res = await ninjaResponse(path);
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

const beastPath = (league: string) =>
  `/stash/current/item/overview?league=${encodeURIComponent(league)}&type=Beast`;

export async function getBeasts(league: string) {
  const data = await ninja<{ lines: Beast[] }>(beastPath(league));
  return data.lines;
}

/**
 * When poe.ninja last handed over the prices a page is showing.
 *
 * Asking again costs nothing: it is the same request the beasts came from, so
 * it is answered out of the data cache, and the stored response still carries
 * the Date poe.ninja sent with it. That is the age of the numbers themselves,
 * which is what a countdown has to be built on. A render is no measure of it:
 * the same numbers are rendered over and over while they sit in the cache.
 */
export async function pricesFetchedAt(league: string) {
  const res = await ninjaResponse(beastPath(league));
  return Date.parse(res.headers.get("date") ?? "") || Date.now();
}

export type Scarab = {
  id: string;
  /** What the card shows — the icon carries the rest. */
  name: string;
  /** The full name, for the hover title. */
  fullName: string;
  icon: string;
  /** Chaos each, from the currency exchange. */
  chaosValue: number;
  /** Stack sizes the card prints. 1 is the unit price. */
  show: number[];
  /** How many of it a full setup uses — what the total is built from. */
  run: number;
};

/** The scarabs that decide whether a beast run is worth setting up. */
const BESTIARY_SCARABS = [
  {
    id: "bestiary-scarab-of-duplicating",
    name: "Duplicating",
    fullName: "Bestiary Scarab of Duplicating",
    icon: "/duplicating_scarab.png",
    show: [1, 20],
    run: 20,
  },
  {
    id: "bestiary-scarab-of-the-herd",
    name: "The Herd",
    fullName: "Bestiary Scarab of the Herd",
    icon: "/herd_scarab.png",
    show: [1, 40],
    run: 40,
  },
  {
    id: "kalguuran-scarab",
    name: "Kalguuran",
    fullName: "Kalguuran Scarab",
    icon: "/kalguuran_scarab.png",
    show: [1, 40],
    run: 40,
  },
];

/**
 * poe.ninja hands out image paths without a host, and the host is not its own:
 * `poe.ninja/gen/image/…` is a 404, while the same path on GGG's CDN serves the
 * icon. Which is why nothing had to be added to next.config for these.
 */
const IMAGES = "https://web.poecdn.com";

const exchangePath = (league: string, type: string) =>
  `/exchange/current/overview?league=${encodeURIComponent(league)}&type=${type}`;

/** One thing the currency exchange prices, named and pictured. */
export type ExchangeItem = {
  id: string;
  name: string;
  icon: string;
  /** Chaos each. */
  chaosValue: number;
};

/**
 * Everything of one kind the exchange prices, by name.
 *
 * Scarabs and astrolabes are the same request with a different `type`, which is
 * worth knowing: astrolabes were first built on trade lookups because a sweep
 * for them missed this endpoint, and that cost a rate limited cron slice for
 * data that was here all along.
 */
async function exchangeItems(
  league: string,
  type: string,
): Promise<ExchangeItem[]> {
  const data = await ninja<{
    lines: { id: string; primaryValue: number }[];
    items: { id: string; name: string; image: string }[];
    core: { primary: string };
  }>(exchangePath(league, type));

  if (data.core?.primary !== "chaos") return [];
  const named = new Map((data.items ?? []).map((item) => [item.id, item]));

  return (data.lines ?? [])
    .flatMap((line) => {
      const item = named.get(line.id);
      if (!item || !line.primaryValue) return [];
      return [
        {
          id: line.id,
          name: item.name,
          icon: `${IMAGES}${item.image}`,
          chaosValue: line.primaryValue,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * All hundred-odd scarabs. `getScarabPrices` below answers a different
 * question: what a beast run costs, which is three known scarabs in known
 * amounts.
 */
export const getAllScarabs = (league: string) =>
  exchangeItems(league, "Scarab");

/** All ten astrolabes. */
export const getAstrolabes = (league: string) =>
  exchangeItems(league, "Astrolabe");

export async function getScarabPrices(league: string): Promise<Scarab[]> {
  const data = await ninja<{
    lines: { id: string; primaryValue: number }[];
    core: { primary: string };
  }>(exchangePath(league, "Scarab"));

  // The exchange quotes in a primary currency; for PoE 1 that is chaos.
  const chaos = data.core?.primary === "chaos";
  const byId = new Map(data.lines.map((line) => [line.id, line.primaryValue]));

  return BESTIARY_SCARABS.flatMap((scarab) => {
    const value = byId.get(scarab.id);
    return value === undefined || !chaos
      ? []
      : [{ ...scarab, chaosValue: value }];
  });
}

/**
 * The two rates the page is read against, both in chaos: the Divine Orb every
 * larger price is quoted in, and the Mirror of Kalandra at the top of the
 * economy. One overview holds both, so it is fetched once.
 */
export type CurrencyPrices = { divine?: number; mirror?: number };

export async function getCurrencyPrices(
  league: string,
): Promise<CurrencyPrices> {
  const data = await ninja<{
    lines: { id: string; primaryValue: number }[];
    core: { primary: string };
  }>(
    `/exchange/current/overview?league=${encodeURIComponent(league)}&type=Currency`,
  );

  if (data.core?.primary !== "chaos") return {};
  const value = (id: string) =>
    data.lines.find((line) => line.id === id)?.primaryValue;
  return { divine: value("divine"), mirror: value("mirror") };
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
