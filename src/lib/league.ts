import { getLeagues, leagueSlug } from "./ninja.ts";

/**
 * A league lives in the path of the tools that read prices, rather than in a
 * query string, which is what lets those pages be statically generated and
 * revalidated instead of rendered per request. The tools that read no prices
 * carry no league at all.
 *
 * The slug is the one poe.ninja uses in its own URLs: one spelling to think
 * about, and `/beasts/allflame` here lines up with theirs.
 */
export async function resolveLeague(slug: string) {
  const leagues = await getLeagues();
  const league = leagues.find((l) => leagueSlug(l.id) === slug);
  return { leagues, league: league?.id };
}

/** The league a bare visit lands on: whatever poe.ninja lists first. */
export async function defaultLeagueSlug() {
  const leagues = await getLeagues();
  return leagueSlug(leagues[0]?.id ?? "Standard");
}

export async function leagueParams() {
  const leagues = await getLeagues();
  return leagues.map((l) => ({ league: leagueSlug(l.id) }));
}
