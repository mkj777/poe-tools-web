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

export const metadata = {
  title: "PoE Beast Prices",
  description: "Every Path of Exile 1 beast on the market, sortable by value.",
};

export default async function Page({ params }: PageProps<"/[league]">) {
  // Rendered per visit, so the numbers are the ones poe.ninja has now rather
  // than the ones it had when somebody last happened to look. That is only
  // affordable because nothing expensive is left in the render: the fetches sit
  // behind a 15 minute data cache, the trade prices behind one entry a league,
  // and the pattern planning has moved to the worker in the browser, which is
  // where it was always going to run for any threshold that is not a preset.
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
          fetchedAt={fetchedAt}
        />
      </main>
    </PageFrame>
  );
}
