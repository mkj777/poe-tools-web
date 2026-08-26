import Image from "next/image";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { leagueParams, resolveLeague } from "@/lib/league";
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
      {/* The column is the width of the other pages, so the logo in the gutter
          still ends where the heading starts. What is in it is narrower,
          because three steps and a button do not want a whole page. */}
      <main className="mx-auto w-full max-w-6xl px-6 pt-10 pb-16">
        <div className="max-w-3xl">
          <header className="flex items-start gap-4">
            <Image
              src="/poe_leveling_guide_icon.png"
              alt=""
              width={128}
              height={128}
              className="mt-1 size-14 shrink-0 rounded-lg"
            />
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                PoE Leveling Guide
              </h1>
              <p className="text-muted-foreground">
                The next leveling step, in the game window. It turns the page
                itself when you reach the zone.
              </p>
            </div>
          </header>

          <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-3">
            <a
              href={LEVELING_APP.setup}
              className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex h-12 items-center gap-2.5 rounded-lg px-6 text-base font-medium transition-colors"
            >
              <Download className="size-5 shrink-0" />
              Download for Windows
            </a>
            <span className="text-muted-foreground flex gap-4 text-sm">
              <a
                href={LEVELING_APP.portable}
                className="hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Portable zip
              </a>
              <a
                href={LEVELING_APP.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-4 transition-colors"
              >
                GitHub
              </a>
            </span>
          </div>

          <ol className="text-muted-foreground mt-8 space-y-2.5 text-sm">
            {LEVELING_SETUP.map((step, i) => (
              <li key={step} className="flex items-baseline gap-3">
                <span className="bg-secondary text-foreground flex size-6 shrink-0 items-center justify-center self-start rounded-full text-xs font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <Image
            src="/poe_leveling_guide_ingame.webp"
            alt="The overlay in the game window, showing the next step: The Climb."
            width={1920}
            height={1080}
            className="border-border/60 mt-10 h-auto w-full rounded-lg border"
          />

          <p className="text-muted-foreground mt-6 text-sm">
            Hotkeys, position and opacity are in the app&rsquo;s settings. MIT,
            built on{" "}
            <a
              href="https://github.com/Kazte/path-of-levelling"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Kazte/path-of-levelling
            </a>
            .
          </p>
        </div>
      </main>
    </PageFrame>
  );
}
