/**
 * Walks every beast poe.ninja does not price and asks the trade site what it
 * costs, writing the result to src/lib/trade-prices.fallback.json.
 *
 *   node scripts/fetch-trade-prices.mjs [league]
 *
 * That file is the snapshot a fresh deployment serves before the cron has
 * warmed the cache.
 *
 * It is slow on purpose. The trade API allows 5 requests per 10s, 15 per 60s,
 * 30 per 300s and 600 per 6h, and exceeding the 300s bucket locks the whole IP
 * out for half an hour — including the game client and anything else running.
 * So this takes only a minority share of each bucket, obeys the rate-limit
 * headers, and resumes where it left off. Expect roughly an hour, and run it
 * when you are not playing.
 */
import { readFileSync, writeFileSync } from "node:fs";

const UA = "poe-tools-web/0.1 (personal price tool; maxikie02@gmail.com)";
const TRADE = "https://www.pathofexile.com/api/trade";
const NINJA = "https://poe.ninja/poe1/api/economy";

/**
 * Base spacing, deliberately far below what the limits allow.
 *
 * The binding rule is 30 requests per 300s, and breaking it costs a 30 minute
 * lockout for the whole IP — which is shared with the game client and anything
 * else on the machine. 11s spacing sits at 27/300 and tripped it. 25s sits at
 * 12/300, leaving well over half the budget for everything else.
 */
const SPACING_MS = Number(process.env.TRADE_SPACING_MS ?? 25_000);

/** Never use more than this share of any rate-limit bucket. */
const BUDGET_SHARE = 0.4;

const OUT = new URL("../src/lib/trade-prices.fallback.json", import.meta.url);

const CURRENCY_NAMES = {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Shaped like the body Awakened PoE Trade sends. `status: "any"` is load
 * bearing — an earlier version used "online" and every single beast came back
 * with zero listings, which is what the control check below now catches.
 */
const tradeQuery = (name) => ({
  query: {
    status: { option: "any" },
    type: name,
    stats: [{ type: "and", filters: [] }],
    filters: {},
  },
  sort: { price: "asc" },
});

/**
 * Turns the rate-limit headers into how long to wait before the next request.
 *
 *   x-rate-limit-ip:       "5:10:60,15:60:300,30:300:1800"   limit:period:penalty
 *   x-rate-limit-ip-state: "1:10:0,1:60:0,5:300:0"           used:period:blocked
 *
 * For each rule, spreading its remaining budget over the rest of its window
 * gives a safe interval; the strictest one wins.
 */
function pauseFor(headers, remaining) {
  const rules = (headers.get("x-rate-limit-ip") ?? "").split(",").filter(Boolean);
  const state = (headers.get("x-rate-limit-ip-state") ?? "").split(",").filter(Boolean);
  let wait = 0;

  for (const [i, rule] of rules.entries()) {
    const [limit, period] = rule.split(":").map(Number);
    const [used] = (state[i] ?? "0:0:0").split(":").map(Number);
    if (!limit || !period) continue;

    const share = Math.max(Math.floor(limit * BUDGET_SHARE), 1);
    const left = share - used;

    // A bucket the rest of this run cannot exhaust imposes nothing. Otherwise
    // spread what is left of our share across the window, and if it is already
    // gone — someone else on this IP is using it — sit out the whole window.
    if (left >= remaining) continue;
    wait = Math.max(wait, left <= 0 ? period * 1000 : (period / share) * 1000);
  }
  return wait;
}

let extraPause = 0;
let remainingLookups = 1;

const get = async (url, init, attempt = 0) => {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, ...(init?.headers ?? {}) },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? 60);
    console.log(`   rate limited, waiting ${retryAfter}s`);
    await sleep((retryAfter + 2) * 1000);
    if (attempt >= 3) throw new Error(`429 after ${attempt} retries: ${url}`);
    return get(url, init, attempt + 1);
  }

  extraPause = Math.max(extraPause, pauseFor(res.headers, remainingLookups));
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

/** Wait out whatever the last response's headers asked for. */
async function settle() {
  const wait = Math.max(SPACING_MS, extraPause);
  extraPause = 0;
  await sleep(wait);
}

const league = process.argv[2] ?? (await get(`${NINJA}/leagues`))[0].id;
console.log(`league: ${league}`);

const [{ lines: priced }, tradeData, currency] = await Promise.all([
  get(`${NINJA}/stash/current/item/overview?league=${encodeURIComponent(league)}&type=Beast`),
  get(`${TRADE}/data/items`),
  get(`${NINJA}/stash/current/currency/overview?league=${encodeURIComponent(league)}&type=Currency`),
]);

const rates = { "Chaos Orb": 1 };
for (const line of currency.lines ?? []) rates[line.currencyTypeName] = line.chaosEquivalent;

const known = new Set(priced.map((b) => b.name));
const missing = tradeData.result
  .find((g) => g.label === "Itemised Monsters")
  .entries.map((e) => e.name ?? e.type)
  .filter((name) => name && !known.has(name))
  .sort();

console.log(`${priced.length} priced by poe.ninja, ${missing.length} without a price`);

let existing = {};
try {
  existing = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
  existing = {};
}
const out = { ...existing, [league]: { ...(existing[league] ?? {}) } };

// Resume: anything already in the snapshot is left alone unless --force.
const force = process.argv.includes("--force");
const todo = force ? missing : missing.filter((name) => !out[league][name]);
if (todo.length !== missing.length) {
  console.log(`resuming — ${missing.length - todo.length} already known\n`);
}

/**
 * Before trusting a single result, ask about a beast that certainly sells —
 * the one poe.ninja sees the most listings for. If even that comes back empty
 * the query is wrong, and writing 142 zeroes would bury the bug in data.
 */
const control = [...priced].sort(
  (a, b) => (b.listingCount ?? 0) - (a.listingCount ?? 0),
)[0];
if (control) {
  const check = await get(`${TRADE}/search/${encodeURIComponent(league)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tradeQuery(control.name)),
  });
  console.log(
    `control: ${control.name} — ${check.total} trade listings ` +
      `(poe.ninja sees ${control.listingCount})`,
  );
  if (!check.total) {
    console.error(
      "\nThat beast has listings on poe.ninja but none here, so the query is " +
        "wrong, not the market. Aborting rather than recording zeroes.",
    );
    process.exit(1);
  }
  await settle();
}

let withListings = 0;
for (const [i, name] of todo.entries()) {
  remainingLookups = todo.length - i;
  if (i > 0) await settle();
  try {
    const search = await get(`${TRADE}/search/${encodeURIComponent(league)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tradeQuery(name)),
    });

    let chaosValue = 0;
    if (search.total > 0 && search.result.length > 0) {
      const fetched = await get(
        `${TRADE}/fetch/${search.result[0]}?query=${search.id}`,
      );
      const price = fetched.result?.[0]?.listing?.price;
      const rate = price ? rates[CURRENCY_NAMES[price.currency] ?? ""] : undefined;
      if (price && rate !== undefined) {
        chaosValue = Math.round(price.amount * rate * 100) / 100;
      }
      withListings++;
    }

    out[league][name] = {
      chaosValue,
      listingCount: search.total ?? 0,
      checkedAt: new Date().toISOString(),
    };
    console.log(
      `[${String(i + 1).padStart(3)}/${todo.length}] ${name.padEnd(34)} ${String(chaosValue).padStart(8)}c  (${search.total} listings)`,
    );
  } catch (error) {
    console.log(`[${String(i + 1).padStart(3)}/${todo.length}] ${name.padEnd(34)} FAILED: ${error.message}`);
  }

  // Write as we go, so an interrupted run still leaves usable data.
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
}

const total = Object.keys(out[league]).length;
console.log(
  `\ndone. ${todo.length} looked up, ${withListings} of them had a listing. ` +
    `${total}/${missing.length} beasts in the snapshot.`,
);
