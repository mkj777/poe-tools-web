import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { hasListing, loadBeasts } from "@/lib/beasts";
import { leagueParams, resolveLeague } from "@/lib/league";
import { leagueSlug } from "@/lib/ninja";
import { BestiarySimulator } from "@/components/bestiary-simulator";
import { PageFrame } from "@/components/page-frame";

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
    <PageFrame
      belowLogo={
        <div className="px-3 pt-3">
          <Link
            href={`/${leagueSlug(league)}`}
            className="bg-secondary/60 hover:bg-secondary text-foreground flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Prices
          </Link>
        </div>
      }
    >
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
    </PageFrame>
  );
}
