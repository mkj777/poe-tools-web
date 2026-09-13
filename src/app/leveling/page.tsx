import type { Metadata } from "next";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { PageFrame } from "@/components/page-frame";
import { Reveal } from "@/components/reveal";
import { LEVELING_FAQ } from "@/lib/faq";
import { LEVELING_APP, LEVELING_SETUP } from "@/lib/leveling-app";
import { LevelingHeader } from "./header";
import { breadcrumbLd, downloadLd } from "@/lib/seo";
import { OG_IMAGE, canonical } from "@/lib/site";

const DESCRIPTION =
  "A free Windows overlay that keeps the next Path of Exile campaign step in the game window and turns its own page when you change zone.";

export const metadata: Metadata = {
  title: "PoE Leveling Guide Overlay",
  description: DESCRIPTION,
  alternates: { canonical: "/leveling" },
  openGraph: {
    url: canonical("/leveling"),
    title: "PoE Leveling Guide Overlay",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/**
 * The one tool here that has never heard of a league, which is why its URL no
 * longer carries one. Nothing on the page comes from the network either, so it
 * is built once and served as it is.
 */
export default function Page() {
  return (
    <PageFrame>
      <JsonLd
        data={downloadLd({
          name: "PoE Leveling Guide",
          path: "/leveling",
          description: DESCRIPTION,
          downloadUrl: LEVELING_APP.setup,
          version: LEVELING_APP.version,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Path of Exile tools", path: "/" },
          { name: "Leveling guide overlay", path: "/leveling" },
        ])}
      />

      {/* A page that is read rather than worked in, so it keeps a column
          narrow enough to read across instead of taking the whole window the
          price table wants. */}
      <div className="mx-auto max-w-5xl">
        <LevelingHeader />

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

        <FaqSection
          faqs={LEVELING_FAQ}
          className="border-border/60 mt-12 border-t pt-8"
        />

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
