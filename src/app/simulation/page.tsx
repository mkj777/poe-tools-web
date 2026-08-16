import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getLeagues } from "@/lib/ninja";
import { hasListing, loadBeasts } from "@/lib/beasts";
import { BestiarySimulator } from "@/components/bestiary-simulator";

export const metadata = {
  title: "Bestiary Simulation",
  description: "Try a Bestiary search against every beast that has a listing.",
};

export default async function Page({ searchParams }: PageProps<"/simulation">) {
  const leagues = await getLeagues();
  const params = await searchParams;
  const requested = params.league;
  const league =
    leagues.find((l) => l.id === requested)?.id ?? leagues[0]?.id ?? "Standard";
  const pattern = typeof params.q === "string" ? params.q : "";

  // Only beasts the game still hands out — the rest can never show up in a
  // Bestiary window, so having them here would only mislead.
  const beasts = (await loadBeasts(league)).filter(hasListing);

  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-6 pt-6 min-[1480px]:absolute min-[1480px]:inset-x-0 min-[1480px]:top-0">
        <div
          className="shrink-0"
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
          <div className="px-3 pt-3">
            <Link
              href={`/?league=${encodeURIComponent(league)}`}
              className="bg-secondary/60 hover:bg-secondary text-foreground flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              Prices
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12">
        <header className="mb-6 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Bestiary simulation
          </h1>
          <p className="text-muted-foreground">
            {beasts.length} beasts with a listing in {league}, searched the way
            the game does — and priced, which the game will not do.
          </p>
        </header>

        <BestiarySimulator beasts={beasts} initialPattern={pattern} />
      </main>
    </div>
  );
}
