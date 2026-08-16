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
 * Names per run. Four every ten minutes is ~575 lookups a day against 143
 * beasts, so each one comes up several times and is actually fetched once,
 * when its 24 hour entry has expired.
 */
const SLICE = Number(process.env.PRICE_REFRESH_SLICE ?? 4);

/**
 * Spacing between lookups. The tightest rule is 30 requests per 300s and
 * breaking it locks the IP out for half an hour, so four requests spread over
 * 36s uses an eighth of that bucket and leaves the rest to the player.
 */
const SPACING_MS = Number(process.env.PRICE_REFRESH_SPACING_MS ?? 12_000);

const SLOT_MS = 10 * 60 * 1000;

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
