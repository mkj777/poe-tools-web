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

/**
 * Where a league URL goes once its league has ended.
 *
 * Every league page is indexed under its league, so the day a new one starts,
 * every link Google holds points at a league poe.ninja no longer lists. Those
 * links are sent to the same tool in the current league instead of a page
 * that says nothing is there: a hardcore slug to the current hardcore league,
 * anything else to the league a bare visit lands on.
 *
 * Undefined when the slug is still a league, or when there is nothing to send
 * it to.
 */
export function successorSlug(
  slug: string,
  leagues: readonly { id: string }[],
): string | undefined {
  const slugs = leagues.map((l) => leagueSlug(l.id));
  if (slugs.length === 0 || slugs.includes(slug)) return undefined;

  if (slug.toLowerCase().endsWith("hc")) {
    // The first hardcore league with a name of its own, never plain Hardcore.
    const hardcore = slugs.find((s) => s.endsWith("hc"));
    if (hardcore) return hardcore;
  }
  return slugs[0];
}
