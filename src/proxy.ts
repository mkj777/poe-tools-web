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

/** After a failed read, how long before poe.ninja is asked again. */
const RETRY_MS = 60 * 1000;

let memo: { at: number; leagues: { id: string }[] } | undefined;

async function leagues() {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.leagues;
  try {
    const res = await fetch(LEAGUES_URL, {
      headers: { "User-Agent": "poe-tools-web/0.1" },
      signal: AbortSignal.timeout(3000),
    });
    const body: unknown = res.ok ? await res.json() : undefined;
    if (!Array.isArray(body)) throw new Error(`poe.ninja leagues -> ${res.status}`);
    memo = { at: Date.now(), leagues: body };
  } catch {
    // A poe.ninja that is down must not make every page wait on it: keep the
    // last list (or none, which redirects nothing) and try again in a minute.
    memo = { at: Date.now() - TTL_MS + RETRY_MS, leagues: memo?.leagues ?? [] };
  }
  return memo.leagues;
}

export async function proxy(request: NextRequest) {
  const [, tool, slug, ...rest] = request.nextUrl.pathname.split("/");

  const next = successorSlug(slug, await leagues());
  if (!next) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = ["", tool, next, ...rest].join("/");
  // Temporary: a slug poe.ninja does not list yet may be tomorrow's league.
  return NextResponse.redirect(url, 307);
}
