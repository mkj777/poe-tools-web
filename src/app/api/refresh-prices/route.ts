/**
 * Keeps trade prices warm for the beasts poe.ninja does not price.
 *
 * Vercel calls this on a schedule (see vercel.json). Each run walks a small
 * slice of the beast list; entries still inside their 24 hour TTL come straight
 * from the cache and cost nothing, so the trade API is only touched for the
 * handful that actually expired. Which slice is derived from the clock, so no
 * state has to be carried between runs.
 */
import { NextResponse } from "next/server";
import { getAllBeastNames, getBeasts, getLeagues } from "@/lib/ninja";
import { allowLiveLookups, getTradePrice } from "@/lib/trade-prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Names per run. The cron is daily, because that is all a Hobby plan allows,
 * and a run has to finish inside maxDuration — ten lookups 5s apart is 45s of
 * a 60s budget. Which walks the 143 unpriced beasts in a fortnight; the
 * committed snapshot is what carries the rest, this only tops it up. On a plan
 * with more frequent crons, raise the schedule rather than the slice.
 */
const SLICE = Number(process.env.PRICE_REFRESH_SLICE ?? 10);

/**
 * Spacing between lookups. The tightest rules are 5 requests per 10s and 30
 * per 300s, and breaking the latter locks the IP out for half an hour — the
 * game client with it. Ten requests over 45s stays a third of the way inside
 * both and leaves the rest of the budget to the player.
 */
const SPACING_MS = Number(process.env.PRICE_REFRESH_SPACING_MS ?? 5_000);

/** One slice per day, so consecutive runs walk different beasts. */
const SLOT_MS = 24 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const leagues = await getLeagues();
  const league = leagues[0]?.id;
  if (!league) {
    return NextResponse.json({ error: "no league" }, { status: 503 });
  }

  const [priced, allNames] = await Promise.all([
    getBeasts(league),
    getAllBeastNames(),
  ]);
  const known = new Set(priced.map((b) => b.name));
  const missing = allNames.filter((name) => !known.has(name)).sort();
  if (missing.length === 0) {
    return NextResponse.json({ league, refreshed: 0, missing: 0 });
  }

  const slot = Math.floor(Date.now() / SLOT_MS);
  const start = (slot * SLICE) % missing.length;
  const slice = Array.from(
    { length: Math.min(SLICE, missing.length) },
    (_, i) => missing[(start + i) % missing.length],
  );

  allowLiveLookups();
  const results: Record<string, number | null> = {};
  for (const [i, name] of slice.entries()) {
    if (i > 0) await sleep(SPACING_MS);
    const price = await getTradePrice(league, name);
    results[name] = price?.chaosValue ?? null;
    // A null means the lookup failed — most likely rate limiting. Stop rather
    // than spend the rest of the slice making it worse.
    if (price === null) break;
  }

  return NextResponse.json({
    league,
    missing: missing.length,
    slice: { start, size: slice.length },
    results,
  });
}
