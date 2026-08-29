import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import {
  getAllScarabs,
  getAstrolabes,
  getCurrencyPrices,
  type CurrencyPrices,
} from "@/lib/ninja";
import { LeagueSelect } from "@/components/league-select";
import { MapSearch } from "@/components/map-search";
import { MapSetup } from "@/components/map-setup";
import { PageFrame, PageHeader } from "@/components/page-frame";

export const metadata = {
  title: "Map Regex",
  description:
    "Build the stash search that highlights the maps you can actually run.",
};

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
      aside={
        <MapSetup
          scarabs={scarabs}
          astrolabes={astrolabes}
          divine={currency.divine}
        />
      }
    >
      {/* The page is one field and the controls that fill it, so the heading
          says what the field is for rather than naming the page again over the
          sidebar entry that already names it. */}
      <PageHeader
        title="Highlight all the Maps you want to run with this Regex"
        titleClassName="text-lg font-normal"
        actions={<LeagueSelect leagues={leagues} league={league} />}
      />

      <MapSearch />
    </PageFrame>
  );
}
