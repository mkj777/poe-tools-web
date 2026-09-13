import { usePathname } from "next/navigation";
import { leagueFromPath } from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";

/**
 * The league the chrome follows.
 *
 * The chrome has no league of its own: it follows the page, and falls back to
 * the one a bare visit lands on. The picking happens on the pages that read
 * prices, beside the prices they read. The sidebar and the palette both build
 * links from this, the one as a path segment for the pages here and the other
 * as the name the game spells it with for the links out, so both come from
 * the same list rather than from each other.
 */
export function useLeague(leagues: League[], fallback: string) {
  const pathname = usePathname() ?? "";
  const slug = leagueFromPath(pathname) || fallback;
  const league =
    leagues.find((l) => leagueSlug(l.id) === slug)?.id ?? leagues[0]?.id ?? "";
  return { pathname, slug, league };
}
