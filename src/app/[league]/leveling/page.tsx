import Image from "next/image";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { leagueParams, resolveLeague } from "@/lib/league";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/page-frame";
import { LEVELING_APP, LEVELING_SETUP } from "@/lib/leveling-app";

export const metadata = {
  title: "PoE Leveling Guide",
  description:
    "An overlay that shows the next leveling step in game and turns the page when you change zone.",
};

/**
 * Nothing here comes from the network, so the page would be static either way.
 * The window and the params are the league bar's, not the content's: the tab
 * has to exist under every league the bar can switch to.
 */
export const revalidate = 900;

export const generateStaticParams = leagueParams;

export default async function Page({
  params,
}: PageProps<"/[league]/leveling">) {
  // The app has no notion of a league. The segment is here because the bar is.
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();

  return (
    <PageFrame>
      {/* The whole column, the way the other pages use it: what it is and how
          to get it across the top, the app itself underneath at the size the
          overlay is actually readable at, and the three steps under that. */}
      <main className="mx-auto w-full max-w-6xl px-6 pt-10 pb-16">
        <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div className="flex items-start gap-4">
            <Image
              src="/poe_leveling_guide_icon.png"
              alt=""
              width={128}
              height={128}
              className="mt-1 size-14 shrink-0 rounded-lg"
            />
            <div className="max-w-xl space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                PoE Leveling Guide
              </h1>
              <p className="text-muted-foreground">
                Follows your progress and shows the next step by itself.
                <span className="block">For a quicker Campaign.</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {/* The one thing on the page worth a button. Bigger than any size
                the variants carry, because it is the whole point of the tab. */}
            <Button asChild size="lg" className="h-12 gap-2.5 px-6 text-base">
              <a href={LEVELING_APP.setup}>
                <Download className="size-5" />
                Download for Windows
              </a>
            </Button>
            <span className="flex gap-1">
              <Button asChild variant="link" size="sm" className="underline">
                <a href={LEVELING_APP.portable}>Portable zip</a>
              </Button>
              <Button asChild variant="link" size="sm" className="underline">
                <a
                  href={LEVELING_APP.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </Button>
            </span>
          </div>
        </header>

        <Image
          src="/poe_leveling_guide_ingame.webp"
          alt="The overlay in the game window, showing the steps left in act 1: hand in The Marooned Mariner and The Siren's Cadence, then the waypoint to The Cavern of Wrath."
          width={1920}
          height={1080}
          priority
          className="border-border/60 mt-10 h-auto w-full rounded-xl border"
        />

        <ol className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-3">
          {LEVELING_SETUP.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <Badge variant="secondary" className="size-6 rounded-full px-0">
                {i + 1}
              </Badge>
              <span className="text-muted-foreground text-sm">{step}</span>
            </li>
          ))}
        </ol>

        <p className="text-muted-foreground border-border/60 mt-10 border-t pt-6 text-sm">
          MIT, built on{" "}
          <a
            href="https://github.com/Kazte/path-of-levelling"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            Kazte/path-of-levelling
          </a>
          .
        </p>
      </main>
    </PageFrame>
  );
}
