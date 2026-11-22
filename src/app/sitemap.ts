import type { MetadataRoute } from "next";
import { getLeagues, leagueSlug } from "@/lib/ninja";
import { sitemapEntries } from "@/lib/seo";

/**
 * Built per request. It used to be revalidated every 15 minutes, and on Vercel
 * it never was: the file was served as it was built until the next deploy, so
 * a new league stayed out of the sitemap for as long as nobody deployed (and
 * Allflame stayed in it a week into Covens). Rendering it each time costs one
 * cached read of the league list, which poe.ninja is asked for every 15 minutes
 * anyway.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A sitemap that fails is worse than a short one, so a poe.ninja that is down
  // costs the league pages and leaves the rest of the site listed.
  const leagues = await getLeagues().catch(() => []);
  return sitemapEntries(leagues.map((l) => leagueSlug(l.id)));
}
