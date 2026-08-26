import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight, Download } from "lucide-react";
import { leagueParams, resolveLeague } from "@/lib/league";
import { PageFrame } from "@/components/page-frame";
import {
  LEVELING_APP,
  LEVELING_HOTKEYS,
  LEVELING_SETUP,
} from "@/lib/leveling-app";

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

export default async function Page({ params }: PageProps<"/[league]/leveling">) {
  // The app has no notion of a league. The segment is here because the bar is.
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();

  return (
    <PageFrame>
      <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12">
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
            <p className="text-muted-foreground max-w-2xl">
              An overlay for Path of Exile 1 that keeps the next leveling step
              on screen while you play. Import a route from{" "}
              <a
                href="https://heartofphos.github.io/exile-leveling/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Exile Leveling
              </a>{" "}
              once, and the app turns the page itself: it watches the zone
              changes your client writes to{" "}
              <code className="text-foreground">Client.txt</code> and advances
              the step when you arrive.
            </p>
          </div>
        </header>

        <section className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <a
            href={LEVELING_APP.setup}
            className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex h-12 items-center gap-2.5 rounded-lg px-6 text-base font-medium transition-colors"
          >
            <Download className="size-5 shrink-0" />
            Download for Windows
          </a>
          <p className="text-muted-foreground text-sm">
            {LEVELING_APP.version} installer, {LEVELING_APP.size}. Installs per
            user into <code className="text-foreground">%LocalAppData%</code>,
            so Windows never asks for admin rights. Updates after that are the
            app&rsquo;s own job.
          </p>
        </section>

        <p className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a
            href={LEVELING_APP.portable}
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Portable zip
          </a>
          <a
            href={LEVELING_APP.releases}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4 transition-colors"
          >
            All releases
            <ArrowUpRight className="size-3.5 shrink-0" />
          </a>
          <a
            href={LEVELING_APP.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4 transition-colors"
          >
            Source on GitHub
            <ArrowUpRight className="size-3.5 shrink-0" />
          </a>
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="text-xl font-semibold tracking-tight">Setting up</h2>
            <ol className="text-muted-foreground mt-4 space-y-3 text-sm">
              {LEVELING_SETUP.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="bg-secondary text-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {i + 1}
                  </span>
                  <span>
                    <span className="text-foreground font-medium">
                      {step.title}
                    </span>{" "}
                    {step.detail}
                    {step.code && (
                      <code className="border-border/60 bg-secondary/40 text-foreground mt-1.5 block overflow-x-auto rounded border px-2 py-1 font-mono text-xs whitespace-nowrap">
                        {step.code}
                      </code>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              While you play
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              {LEVELING_HOTKEYS.map((hotkey) => (
                <div key={hotkey.does} className="flex items-baseline gap-3">
                  <dt className="shrink-0">
                    <kbd className="border-border/80 bg-secondary/60 text-foreground rounded border px-2 py-1 font-mono text-xs">
                      {hotkey.keys}
                    </kbd>
                  </dt>
                  <dd className="text-muted-foreground">{hotkey.does}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground mt-4 text-sm">
              The steps are click-through, so the bar sits over the game without
              taking anything the game wanted. Most of the time it advances on
              its own, and the arrows are there for the zones it cannot see.
            </p>
          </section>
        </div>

        <section className="mt-10">
          <Image
            src="/poe_leveling_guide_ingame.webp"
            alt="The step bar over Path of Exile, showing 'Get waypoint, The Mud Flats' above the hotbar."
            width={1920}
            height={1080}
            className="border-border/60 h-auto w-full rounded-lg border"
          />
        </section>

        <p className="text-muted-foreground mt-8 max-w-2xl text-sm">
          Tauri, React and TypeScript, MIT licensed. The app started as a fork
          of{" "}
          <a
            href="https://github.com/Kazte/path-of-levelling"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Kazte/path-of-levelling
          </a>{" "}
          and carries its history; the copyright of that code stays with Kazte.
        </p>
      </main>
    </PageFrame>
  );
}
