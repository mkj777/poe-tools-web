import Image from "next/image";
import { getDivinePrice, getLeagues, getScarabPrices } from "@/lib/ninja";
import { loadBeasts } from "@/lib/beasts";
import { BeastTable } from "@/components/beast-table";
import { LeagueSelect } from "@/components/league-select";
import { ScarabPrices } from "@/components/scarab-prices";
import { SimulationLink } from "@/components/simulation-link";

export const metadata = {
  title: "PoE Beast Prices",
  description: "Every Path of Exile 1 beast on the market, sortable by value.",
};

export default async function Page({ searchParams }: PageProps<"/">) {
  const leagues = await getLeagues();
  const requested = (await searchParams).league;
  const league =
    leagues.find((l) => l.id === requested)?.id ?? leagues[0]?.id ?? "Standard";

  const [beasts, scarabs, divine] = await Promise.all([
    loadBeasts(league),
    getScarabPrices(league).catch(() => []),
    getDivinePrice(league).catch(() => undefined),
  ]);

  return (
    <div className="relative">
      {/* Full width on purpose: logo and scarabs belong in the window corners,
          not inside the centred column the rest of the page lives in. The
          logo fills the whole left gutter, so it ends exactly where the
          heading starts — same 72rem/px-6 geometry as <main>.

          From 1480px up the gutter is at least as wide as the logo's 9rem
          floor, so the row can leave the flow and sit beside the page instead
          of pushing it down. Narrower than that it would overlap, so there it
          stays a normal row above the content. */}
      <div className="pointer-events-none flex items-start justify-between gap-6 pt-6 min-[1480px]:absolute min-[1480px]:inset-x-0 min-[1480px]:top-0">
        {/* The row spans the full width once it is absolute, so it would sit
            on top of the controls below. Only its two columns take clicks. */}
        <div
          className="pointer-events-auto shrink-0 space-y-3"
          style={{ width: "max(9rem, calc((100% - 72rem) / 2 + 1.5rem))" }}
        >
          <Image
            src="/poe_logo.png"
            alt="Path of Exile"
            width={800}
            height={578}
            priority
            className="h-auto w-full"
          />
          <div className="space-y-2 px-3">
            <LeagueSelect
              leagues={leagues}
              value={league}
              className="w-full"
            />
            <SimulationLink league={league} />
          </div>
        </div>

        {/* Same gutter width as the logo, so the cards stay clear of the
            content column instead of covering what sits at its top right. */}
        <div
          className="pointer-events-auto shrink-0 px-4"
          style={{ width: "max(9rem, calc((100% - 72rem) / 2 + 1.5rem))" }}
        >
          <ScarabPrices scarabs={scarabs} divine={divine} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12">
        <BeastTable beasts={beasts} league={league} />
      </main>
    </div>
  );
}
