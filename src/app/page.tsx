import { getAllBeastNames, getBeasts, getLeagues, type Beast } from "@/lib/ninja";
import { getTradePrices } from "@/lib/trade-prices";
import { rarityOf } from "@/lib/beast-rarity";
import { BeastTable } from "@/components/beast-table";
import { LeagueSelect } from "@/components/league-select";

export const metadata = {
  title: "PoE Beast Prices",
  description: "Every Path of Exile 1 beast on the market, sortable by value.",
};

export default async function Page({ searchParams }: PageProps<"/">) {
  const leagues = await getLeagues();
  const requested = (await searchParams).league;
  const league =
    leagues.find((l) => l.id === requested)?.id ?? leagues[0]?.id ?? "Standard";

  const [priced, allNames] = await Promise.all([
    getBeasts(league),
    getAllBeastNames().catch(() => [] as string[]),
  ]);

  // poe.ninja only prices beasts with live listings. The rest come from the
  // trade site via the cron-warmed cache, and 0c means nobody is selling one.
  const known = new Set(priced.map((b) => b.name));
  const missing = allNames.filter((name) => !known.has(name)).sort();
  const tradePrices = await getTradePrices(league, missing);

  const beasts: Beast[] = [
    ...priced.map((b) => ({
      ...b,
      source: "ninja" as const,
      rarity: rarityOf(b.name),
    })),
    ...missing.map((name, i) => {
      const price = tradePrices.get(name);
      return {
        id: -(i + 1),
        name,
        chaosValue: price?.chaosValue,
        listingCount: price?.listingCount ?? 0,
        source: "trade" as const,
        rarity: rarityOf(name),
      };
    }),
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-semibold tracking-tight">Beast Prices</h1>
          <p className="text-muted-foreground">
            Every Path of Exile 1 beast — priced by poe.ninja where it has data,
            by the official trade site everywhere else.
          </p>
        </div>
        <LeagueSelect leagues={leagues} value={league} />
      </header>

      <BeastTable beasts={beasts} />
    </main>
  );
}
