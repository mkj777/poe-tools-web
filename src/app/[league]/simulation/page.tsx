import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { hasListing, loadBeasts } from "@/lib/beasts";
import { leagueParams, resolveLeague } from "@/lib/league";
import { leagueSlug } from "@/lib/ninja";
import { BestiarySimulator } from "@/components/bestiary-simulator";

export const metadata = {
  title: "Bestiary Sim",
  description: "Try a Bestiary search against every beast that has a listing.",
};

/** Same beasts, same 15 minute window as the prices page. */
export const revalidate = 900;

export const generateStaticParams = leagueParams;

export default async function Page({
  params,
}: PageProps<"/[league]/simulation">) {
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();

  // Only beasts the game still hands out — the rest can never show up in a
  // Bestiary window, so having them here would only mislead.
  const beasts = (await loadBeasts(league)).filter(hasListing);

  return (
    <div className="relative">
      {/* Above 1480px this row is absolute and spans the full width, so it
          would sit on top of everything. Only its own column takes clicks. */}
      <div className="pointer-events-none flex items-start justify-between gap-6 pt-6 min-[1480px]:absolute min-[1480px]:inset-x-0 min-[1480px]:top-0">
        <div
          className="pointer-events-auto shrink-0"
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
              href={`/${leagueSlug(league)}`}
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
            Bestiary Sim
          </h1>
          <p className="text-muted-foreground">
            {beasts.length} beasts with a listing in {league}, searched the way
            the game does, and priced, which the game will not do. An empty
            search shows all of them, as in game.
          </p>
        </header>

        <BestiarySimulator beasts={beasts} />
      </main>
    </div>
  );
}
