/**
 * Prices for the beasts poe.ninja does not cover.
 *
 * poe.ninja only lists beasts with current listings, 218 of the 361 GGG's trade
 * data knows. The rest are priced by asking the official trade site directly,
 * exactly as Awakened PoE Trade does for items with no economy data.
 *
 * That API is rate limited (5 requests / 10s, 30 / 300s), so nothing here
 * happens during a page render. There are two paths, and keeping them apart is
 * the whole design:
 *
 * - **Rendering** reads the committed snapshot and nothing else. No cache, no
 *   lookups, no network. It is a file that is already in memory.
 * - **The cron** does the live lookups, behind a per-name cache so a day's runs
 *   never ask the same name twice.
 *
 * They used to share the per-name cache, with the render calling it and the
 * lookup throwing to say "not from here". That threw away the caching too:
 * `unstable_cache` stores a value, not an exception, so nothing was ever kept
 * and every cold instance rebuilt all 142 lookups from scratch. It cost 3.3
 * seconds on a first page render to arrive at the snapshot the render could
 * have read directly, which is what it now does.
 *
 * What that gives up: a price the cron finds is not on the site until the
 * snapshot is regenerated with `pnpm prices:snapshot` and committed. These are
 * the beasts nobody lists, exactly one of which has ever come back with a
 * price, so the freshness was worth a good deal less than the three seconds.
 */
import { unstable_cache } from "next/cache";
import FALLBACK from "./trade-prices.fallback.json";

const TRADE = "https://www.pathofexile.com/api/trade";
const UA = "poe-tools-web/0.1 (personal price tool; maxikie02@gmail.com)";

/** A day, matching how often the cron cycles through every beast. */
export const PRICE_TTL_SECONDS = 86400;

export type TradePrice = {
  /** Chaos value of the cheapest online listing, or 0 when nobody sells it. */
  chaosValue: number;
  listingCount: number;
  checkedAt: string;
};

type Snapshot = Record<string, Record<string, TradePrice>>;

const snapshot = FALLBACK as Snapshot;

/** Trade listings quote all sorts of currency; these are the ones worth handling. */
const CURRENCY_NAMES: Record<string, string> = {
  chaos: "Chaos Orb",
  divine: "Divine Orb",
  exalted: "Exalted Orb",
  alch: "Orb of Alchemy",
  alt: "Orb of Alteration",
  fusing: "Orb of Fusing",
  chrome: "Chromatic Orb",
  vaal: "Vaal Orb",
  regal: "Regal Orb",
  chisel: "Cartographer's Chisel",
  jew: "Jeweller's Orb",
  mirror: "Mirror of Kalandra",
};

async function chaosRates(league: string): Promise<Record<string, number>> {
  const res = await fetch(
    `https://poe.ninja/poe1/api/economy/stash/current/currency/overview` +
      `?league=${encodeURIComponent(league)}&type=Currency`,
    { headers: { "User-Agent": UA }, next: { revalidate: PRICE_TTL_SECONDS } },
  );
  if (!res.ok) return { "Chaos Orb": 1 };

  const data: { lines?: { currencyTypeName: string; chaosEquivalent: number }[] } =
    await res.json();
  const rates: Record<string, number> = { "Chaos Orb": 1 };
  for (const line of data.lines ?? []) {
    rates[line.currencyTypeName] = line.chaosEquivalent;
  }
  return rates;
}

/**
 * The search body, shaped like the one Awakened PoE Trade sends.
 *
 * `status` matters: an earlier version used `"online"`, which came back with
 * zero results for every beast — including ones that certainly sell. APT uses
 * `available` / `securable` / `any`, never `online`. `any` is the widest net,
 * which is what pricing an obscure beast calls for: an offline listing is still
 * evidence that one exists, and 0 then really means nobody has ever listed it.
 */
export function tradeQuery(name: string) {
  return {
    query: {
      status: { option: "any" },
      type: name,
      stats: [{ type: "and", filters: [] }],
      filters: {},
    },
    sort: { price: "asc" },
  };
}

/** Set only inside the cron route — a page render must never call the trade API. */
let liveLookupsAllowed = false;

export function allowLiveLookups() {
  liveLookupsAllowed = true;
}

class LookupNotAllowed extends Error {}

async function lookup(league: string, name: string): Promise<TradePrice> {
  if (!liveLookupsAllowed) throw new LookupNotAllowed(name);

  const search = await fetch(`${TRADE}/search/${encodeURIComponent(league)}`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/json" },
    body: JSON.stringify(tradeQuery(name)),
    cache: "no-store",
  });
  // Never retry a 429. The penalty for the 300s bucket is a half hour lockout
  // for the whole IP, and the snapshot covers us until the next run.
  if (!search.ok) throw new Error(`trade search ${search.status} for ${name}`);

  const { id, result, total } = (await search.json()) as {
    id: string;
    result: string[];
    total: number;
  };
  const checkedAt = new Date().toISOString();
  if (!total || result.length === 0) {
    return { chaosValue: 0, listingCount: 0, checkedAt };
  }

  const fetched = await fetch(
    `${TRADE}/fetch/${result.slice(0, 1).join(",")}?query=${id}`,
    { headers: { "User-Agent": UA }, cache: "no-store" },
  );
  if (!fetched.ok) throw new Error(`trade fetch ${fetched.status} for ${name}`);

  const { result: listings } = (await fetched.json()) as {
    result: { listing?: { price?: { amount: number; currency: string } } }[];
  };
  const price = listings[0]?.listing?.price;
  if (!price) return { chaosValue: 0, listingCount: total, checkedAt };

  const rates = await chaosRates(league);
  const rate = rates[CURRENCY_NAMES[price.currency] ?? ""] ?? null;
  if (rate === null) throw new Error(`unknown currency ${price.currency}`);

  return {
    chaosValue: Math.round(price.amount * rate * 100) / 100,
    listingCount: total,
    checkedAt,
  };
}

/**
 * `use cache` supersedes this in Next 16, but that needs Cache Components
 * enabled app-wide, which is a far larger change than one memo is worth.
 * unstable_cache still persists across requests and deployments, which is all
 * that is wanted here.
 */
const cachedLookup = unstable_cache(lookup, ["trade-price"], {
  revalidate: PRICE_TTL_SECONDS,
});

/**
 * The cached price, the committed snapshot, or null when neither knows it.
 * Never reaches the network unless live lookups were explicitly enabled.
 */
export async function getTradePrice(
  league: string,
  name: string,
): Promise<TradePrice | null> {
  try {
    return await cachedLookup(league, name);
  } catch {
    return snapshot[league]?.[name] ?? null;
  }
}

/**
 * What a render reads: the committed snapshot, straight out of the bundle.
 *
 * Deliberately not async work. Every one of these names fell through to this
 * same file before, it just took a cache round trip and a thrown exception each
 * to get there.
 */
export function getTradePrices(league: string, names: string[]) {
  const known = snapshot[league] ?? {};
  return new Map(
    names.flatMap((name) => (known[name] ? [[name, known[name]] as const] : [])),
  );
}

export const snapshotLeagues = () => Object.keys(snapshot);
