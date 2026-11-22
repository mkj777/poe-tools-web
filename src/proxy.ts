import { NextResponse, type NextRequest } from "next/server";
import { successorSlug } from "@/lib/league";

/**
 * Sends a league URL whose league has ended to the current one.
 *
 * The pages could do it themselves, but they stream: by the time a page knows
 * its league is gone, a 200 and a loading skeleton are already on the wire, and
 * all it can do is render "not found" under that 200. Here nothing has been
 * sent yet, so the redirect is a real one.
 */
export const config = {
  matcher: ["/beasts/:league", "/beasts/:league/simulation", "/maps/:league"],
};

const LEAGUES_URL = "https://poe.ninja/poe1/api/economy/leagues";

/** The pages read the same list every 15 minutes; so does this. */
const TTL_MS = 15 * 60 * 1000;

/** The least time between two reads of poe.ninja, failed or not. */
const RETRY_MS = 60 * 1000;

/** A league slug as poe.ninja spells one. Anything else is not ours to move. */
const SLUG = /^[a-z0-9]+$/i;

let known: { id: string }[] | undefined;
let fetchedAt = 0;
let triedAt = 0;
let inflight: Promise<{ id: string }[]> | undefined;

/** One read at a time, however many requests are waiting on it. */
function refresh() {
  triedAt = Date.now();
  inflight ??= fetch(LEAGUES_URL, {
    headers: { "User-Agent": "poe-tools-web/0.1" },
    signal: AbortSignal.timeout(3000),
  })
    .then(async (res) => {
      const body: unknown = res.ok ? await res.json() : undefined;
      if (!Array.isArray(body)) throw new Error(`poe.ninja leagues -> ${res.status}`);
      known = body;
      fetchedAt = Date.now();
      return body;
    })
    // A poe.ninja that is down must not take the pages with it: keep the last
    // list, or none, which redirects nothing.
    .catch(() => known ?? [])
    .finally(() => {
      inflight = undefined;
    });
  return inflight;
}

/**
 * The league list, answered from memory wherever it can be. A stale list is
 * served at once and refreshed behind the request; only the very first one,
 * or a caller that needs to be sure (`fresh`), waits for poe.ninja.
 */
async function leagues(fresh = false) {
  const canTry = Date.now() - triedAt >= RETRY_MS;
  if (!known) return canTry ? refresh() : (inflight ?? []);
  if (canTry && fresh) return refresh();
  if (canTry && Date.now() - fetchedAt >= TTL_MS) void refresh();
  return known;
}

export async function proxy(request: NextRequest) {
  const [, tool, slug = "", ...rest] = request.nextUrl.pathname.split("/");
  // Prefetches arrive as `/maps/covens.segments/...`: not a league, leave it.
  if (!SLUG.test(slug)) return NextResponse.next();

  let next = successorSlug(slug, await leagues());
  // A slug missing from the list may only be missing from an old copy of it,
  // the day a league starts. Ask once more before sending anyone away. A slug
  // that only differed in case was found, and needs no second look.
  if (next && next !== slug.toLowerCase()) {
    next = successorSlug(slug, await leagues(true));
  }
  if (!next) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = ["", tool, next, ...rest].join("/");
  // Temporary: a slug poe.ninja does not list yet may be tomorrow's league.
  return NextResponse.redirect(url, 307);
}
