import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import { leagueSlug } from "@/lib/ninja";
import { breadcrumbLd, webAppLd } from "@/lib/seo";
import { OG_IMAGE, canonical } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { LeagueSelect } from "@/components/league-select";
import { MapSearch } from "@/components/map-search";
import { PageFrame } from "@/components/page-frame";
import { MapsHeader } from "./header";

/**
 * The modifiers are the same in every league, so every one of these pages says
 * the same thing about maps and a different thing about prices. The league in
 * the title is what keeps them from reading as one page served twice.
 */
export async function generateMetadata({
  params,
}: PageProps<"/maps/[league]">): Promise<Metadata> {
  const slug = (await params).league;
  const { league } = await resolveLeague(slug);
  const name = league ?? slug;
  const path = `/maps/${slug}`;
  const title = `PoE Map Regex Generator (${name})`;
  const description = `Tick the map modifiers your build cannot survive and get the Path of Exile stash search that hides every map carrying one, with current scarab prices beside it.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: canonical(path),
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

/** Same window poe.ninja recomputes its overviews in, as everywhere else. */
export const revalidate = 900;

export const generateStaticParams = leagueParams;

export default async function Page({ params }: PageProps<"/maps/[league]">) {
  // Map modifiers do not change with the league. The prices of the setup panel
  // did, which is why this page carries one; the panel is hidden for now (see
  // below), so the league currently changes nothing on the page.
  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  return (
    <PageFrame
      header={
        <MapsHeader
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
      // The setup panel (src/components/map-setup.tsx) is hidden for now, and
      // its price fetches with it: 3.30 removed scarabs from the game and
      // Threads replace them, and what the panel becomes is not decided yet.
    >
      <JsonLd
        data={webAppLd({
          name: "PoE map regex generator",
          path: `/maps/${leagueSlug(league)}`,
          description:
            "Builds the Path of Exile stash search that hides the maps carrying modifiers you cannot run.",
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Path of Exile tools", path: "/" },
          { name: "Map regex", path: `/maps/${leagueSlug(league)}` },
        ])}
      />

      <MapSearch />
    </PageFrame>
  );
}
