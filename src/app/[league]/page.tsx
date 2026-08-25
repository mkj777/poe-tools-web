import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  getCurrencyPrices,
  getScarabPrices,
  pricesFetchedAt,
  type CurrencyPrices,
} from "@/lib/ninja";
import { loadBeasts } from "@/lib/beasts";
import { resolveLeague } from "@/lib/league";
import { BeastTable } from "@/components/beast-table";
import { ScarabPrices } from "@/components/scarab-prices";
import { PageFrame } from "@/components/page-frame";
import { getPresetPlans, presetSplits } from "@/lib/preset-plans";

export const metadata = {
  title: "PoE Beast Prices",
  description: "Every Path of Exile 1 beast on the market, sortable by value.",
};

export default async function Page({ params }: PageProps<"/[league]">) {
  // Built once and cached, this page showed whatever the numbers were when it
  // was built, which on a quiet site is hours. Everything expensive about it is
  // cached a layer down instead: poe.ninja is asked four times an hour at most
  // and the pattern planning is memoised, so rendering per visit costs little
  // and always shows the freshest prices there are.
  await connection();

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
