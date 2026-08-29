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
import { LeagueSelect } from "@/components/league-select";
import { PageFrame, PageHeader } from "@/components/page-frame";

export const metadata = {
  title: "Beast Regex",
  description: "Every Path of Exile 1 beast on the market, sortable by value.",
};

export default async function Page({ params }: PageProps<"/beasts/[league]">) {
  // Rendered per visit, so the numbers are the ones poe.ninja has now rather
  // than the ones it had when somebody last happened to look. That is only
  // affordable because nothing expensive is left in the render: the fetches sit
  // behind a 15 minute data cache, the trade prices behind one entry a league,
  // and the pattern planning has moved to the worker in the browser, which is
  // where it was always going to run for any threshold that is not a preset.
  await connection();

  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  const [beasts, scarabs, currency] = await Promise.all([
    loadBeasts(league),
    getScarabPrices(league).catch(() => []),
    getCurrencyPrices(league).catch((): CurrencyPrices => ({})),
  ]);

  // A mirror is quoted in divines, never in chaos: nobody counts that high.
  const { divine, mirror } = currency;
  const mirrorInDivine = divine && mirror ? mirror / divine : undefined;

  const fetchedAt = await pricesFetchedAt(league);

  return (
    <PageFrame
      asideFirst
      header={
        <PageHeader
          title="Beast Regex"
          description="Every beast on the market, and the Bestiary search that picks the ones worth the trip."
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
      aside={
        <ScarabPrices
          scarabs={scarabs}
          divine={divine}
          mirror={mirrorInDivine}
          mirrorChaos={mirror}
        />
      }
    >
      <BeastTable beasts={beasts} league={league} fetchedAt={fetchedAt} />
    </PageFrame>
  );
}
