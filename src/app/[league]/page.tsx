import { notFound } from "next/navigation";
import {
  getCurrencyPrices,
  getScarabPrices,
  pricesFetchedAt,
  type CurrencyPrices,
} from "@/lib/ninja";
import { loadBeasts } from "@/lib/beasts";
import { leagueParams, resolveLeague } from "@/lib/league";
import { BeastTable } from "@/components/beast-table";
import { ScarabPrices } from "@/components/scarab-prices";
import { PageFrame } from "@/components/page-frame";
import { getPresetPlans, presetSplits } from "@/lib/preset-plans";

/**
 * The prices underneath are fetched on a 15 minute window, so a render can
 * never be fresher than that however often it runs. What changes with this line
 * is who pays for it: the page is built once per window and served from cache,
 * instead of every visitor waiting through the fetches and the pattern planning.
 *
 * The visitor is not lied to. `PriceClock` reads the age of the numbers off
 * their own clock and prints it, so a page served from cache says how old it is.
 */
export const revalidate = 900;

/**
 * Without this the route has no paths to build, so it stays server-rendered on
 * demand and the revalidate window has nothing to hold. With it, the four
 * leagues are rendered at build time and refreshed in the background, which is
 * what `leagueParams` was written for.
 */
export const generateStaticParams = leagueParams;

export const metadata = {
  title: "PoE Beast Prices",
  description: "Every Path of Exile 1 beast on the market, sortable by value.",
};

export default async function Page({ params }: PageProps<"/[league]">) {
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();

  const [beasts, scarabs, currency] = await Promise.all([
    loadBeasts(league),
    getScarabPrices(league).catch(() => []),
    getCurrencyPrices(league).catch((): CurrencyPrices => ({})),
  ]);

  // A mirror is quoted in divines, never in chaos — nobody counts that high.
  const { divine, mirror } = currency;
  const mirrorInDivine = divine && mirror ? mirror / divine : undefined;

  // Planning is the one slow thing here, so the preset thresholds arrive ready
  // made and only an unusual threshold ever reaches the worker in the browser.
  const plans = await getPresetPlans(presetSplits(beasts));

  const fetchedAt = await pricesFetchedAt(league);

  return (
    <PageFrame
      aside={
        <ScarabPrices
          scarabs={scarabs}
          divine={divine}
          mirror={mirrorInDivine}
          mirrorChaos={mirror}
        />
      }
    >
      <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12">
        <BeastTable
          beasts={beasts}
          league={league}
          plans={plans}
          fetchedAt={fetchedAt}
        />
      </main>
    </PageFrame>
  );
}
