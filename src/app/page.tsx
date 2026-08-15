import { getAllBeastNames, getBeasts, getLeagues } from "@/lib/ninja";
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

  const [beasts, allNames] = await Promise.all([
    getBeasts(league),
    getAllBeastNames().catch(() => [] as string[]),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-semibold tracking-tight">Beast Prices</h1>
          <p className="text-muted-foreground">
            All Path of Exile 1 beasts on the market — data from poe.ninja,
            refreshed every 15 minutes.
          </p>
        </div>
        <LeagueSelect leagues={leagues} value={league} />
      </header>

      <BeastTable beasts={beasts} allNames={allNames} />
    </main>
  );
}
