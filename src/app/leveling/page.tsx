import Image from "next/image";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { Reveal } from "@/components/reveal";
import { LEVELING_APP, LEVELING_SETUP } from "@/lib/leveling-app";

export const metadata = {
  title: "PoE Leveling Guide",
  description:
    "An overlay that shows the next leveling step in game and turns the page when you change zone.",
};

/**
 * The one tool here that has never heard of a league, which is why its URL no
 * longer carries one. Nothing on the page comes from the network either, so it
 * is built once and served as it is.
 */
export default function Page() {
  return (
    <PageFrame>
      {/* A page that is read rather than worked in, so it keeps a column
          narrow enough to read across instead of taking the whole window the
          price table wants. */}
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <Image
                src="/poe_leveling_guide_icon.png"
                alt=""
                width={128}
                height={128}
                className="size-9 shrink-0 rounded-lg"
              />
              PoE Leveling Guide
            </span>
          }
          description={
            <>
              Follows your progress and shows the next step by itself.
              <span className="block">For a quicker Campaign.</span>
            </>
          }
          actions={
            <div className="flex flex-col items-start gap-1 sm:items-end">
              {/* The one thing on the page worth a button. Bigger than any size
                the variants carry, because it is the whole point of the tab. */}
              <Button asChild size="lg" className="h-12 gap-2.5 px-6 text-base">
                <a href={LEVELING_APP.setup}>
                  <Download className="size-5" />
                  Download for Windows
                </a>
              </Button>
              <span className="flex gap-1">
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="h-9 underline"
                >
                  <a href={LEVELING_APP.portable}>Portable zip</a>
                </Button>
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="h-9 underline"
                >
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
          }
        />

        <Reveal delay={0.05}>
          <Image
            src="/poe_leveling_guide_ingame.webp"
            alt="The overlay in the game window, showing the steps left in act 1: hand in The Marooned Mariner and The Siren's Cadence, then the waypoint to The Cavern of Wrath."
            width={1920}
            height={1080}
            priority
            className="border-border/60 h-auto w-full rounded-xl border"
          />
        </Reveal>

        <ol className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          {LEVELING_SETUP.map((step, i) => (
            <Reveal
              key={step}
              as="li"
              delay={0.12 + i * 0.06}
              className="flex items-start gap-3"
            >
              <Badge variant="secondary" className="size-6 rounded-full px-0">
                {i + 1}
              </Badge>
              <span className="text-muted-foreground text-sm">{step}</span>
            </Reveal>
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
      </div>
    </PageFrame>
  );
}
