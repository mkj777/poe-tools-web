import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import {
  getAllScarabs,
  getAstrolabes,
  getCurrencyPrices,
  leagueSlug,
  type CurrencyPrices,
} from "@/lib/ninja";
import { MAPS_FAQ } from "@/lib/faq";
import { breadcrumbLd, webAppLd } from "@/lib/seo";
import { OG_IMAGE, canonical } from "@/lib/site";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { LeagueSelect } from "@/components/league-select";
import { MapSearch } from "@/components/map-search";
import { MapSetup } from "@/components/map-setup";
import { PageFrame, PageHeader } from "@/components/page-frame";

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
  // Map modifiers do not change with the league. The prices beside them do,
  // which is the only reason this page carries one.
  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  // A missing price list costs the panel a row, never the page. The regex is
  // what the page is for, and it needs nothing from the network.
  const [scarabs, astrolabes, currency] = await Promise.all([
    getAllScarabs(league).catch(() => []),
    getAstrolabes(league).catch(() => []),
    getCurrencyPrices(league).catch((): CurrencyPrices => ({})),
  ]);

  return (
    <PageFrame
      header={
        /* The page is one field and the controls that fill it, so the heading
           says what the field is for rather than naming the page again over
           the sidebar entry that already names it. */
        <PageHeader
          title="Highlight all the Maps you want to run with this Regex"
          titleClassName="text-lg font-normal"
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
      aside={
        <MapSetup
          scarabs={scarabs}
          astrolabes={astrolabes}
          divine={currency.divine}
        />
      }
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

      <FaqSection
        faqs={MAPS_FAQ}
        className="border-border/60 mt-12 border-t pt-8"
      />
    </PageFrame>
  );
}
