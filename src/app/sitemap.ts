import type { MetadataRoute } from "next";
import { getLeagues, leagueSlug } from "@/lib/ninja";
import { sitemapEntries } from "@/lib/seo";

/** Same window the prices are read in: a new league appears without a deploy. */
export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A sitemap that fails is worse than a short one, so a poe.ninja that is down
  // costs the league pages and leaves the rest of the site listed.
  const leagues = await getLeagues().catch(() => []);
  return sitemapEntries(leagues.map((l) => leagueSlug(l.id)));
}
