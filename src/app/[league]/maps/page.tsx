import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import {
  getAllScarabs,
  getAstrolabes,
  getCurrencyPrices,
  type CurrencyPrices,
} from "@/lib/ninja";
import { MapSearch } from "@/components/map-search";
import { MapSetup } from "@/components/map-setup";
import { PageFrame } from "@/components/page-frame";

export const metadata = {
  title: "Map Regex",
  description:
    "Build the stash search that highlights the maps you can actually run.",
};

/** Same window poe.ninja recomputes its overviews in, as everywhere else. */
export const revalidate = 900;

export const generateStaticParams = leagueParams;

export default async function Page({ params }: PageProps<"/[league]/maps">) {
  // Map modifiers do not change with the league. The prices beside them do,
  // which is the other reason the segment is here.
  const { league } = await resolveLeague((await params).league);
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
      <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12">
        {/* The page is one field and the controls that fill it, so the
            heading says what the field is for rather than naming the page
            again over the tab that already names it. */}
        <h1 className="mb-6 text-lg font-normal tracking-tight text-balance">
          Highlight all the Maps you want to run with this Regex
        </h1>

        <MapSearch />
      </main>
    </PageFrame>
  );
}
