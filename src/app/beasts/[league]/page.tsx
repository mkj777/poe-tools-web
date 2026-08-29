import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  getCurrencyPrices,
  getScarabPrices,
  leagueSlug,
  pricesFetchedAt,
  type CurrencyPrices,
} from "@/lib/ninja";
import { loadBeasts } from "@/lib/beasts";
import { resolveLeague } from "@/lib/league";
import { BEASTS_FAQ } from "@/lib/faq";
import { breadcrumbLd, webAppLd } from "@/lib/seo";
import { OG_IMAGE, canonical } from "@/lib/site";
import { BeastTable } from "@/components/beast-table";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { LeagueSelect } from "@/components/league-select";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ScarabPrices } from "@/components/scarab-prices";

/**
 * The name in the sidebar is Beast Regex, which is what the page is called once
 * you know it exists. What people type is "poe bestiary" and "beast prices", so
 * that is what the title says: a tab is read by somebody who is already here, a
 * search result by somebody who is not.
 */
export async function generateMetadata({
  params,
}: PageProps<"/beasts/[league]">): Promise<Metadata> {
  const slug = (await params).league;
  const { league } = await resolveLeague(slug);
  const name = league ?? slug;
  const path = `/beasts/${slug}`;
  const title = `PoE Bestiary: Beast Prices (${name})`;
  const description = `Every Path of Exile beast on the ${name} market with its chaos value and 7 day change, plus the Bestiary regex that highlights the ones worth selling.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: canonical(path),
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function Page({ params }: PageProps<"/beasts/[league]">) {
  // Rendered per visit, so the numbers are the ones poe.ninja has now rather
  // than the ones it had when somebody last happened to look. That is only
  // affordable because nothing expensive is left in the render: the fetches sit
  // behind a 15 minute data cache, the trade prices behind one entry a league,
  // and the pattern planning has moved to the worker in the browser, which is
  // where it was always going to run for any threshold that is not a preset.
  await connection();

  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  const [beasts, scarabs, currency] = await Promise.all([
    loadBeasts(league),
    getScarabPrices(league).catch(() => []),
    getCurrencyPrices(league).catch((): CurrencyPrices => ({})),
  ]);

  // A mirror is quoted in divines, never in chaos: nobody counts that high.
  const { divine, mirror } = currency;
  const mirrorInDivine = divine && mirror ? mirror / divine : undefined;

  const fetchedAt = await pricesFetchedAt(league);

  return (
    <PageFrame
      asideFirst
      header={
        <PageHeader
          title="Beast Regex"
          description="Every beast on the market for this league, and the Bestiary search that picks out the ones worth the trip. Prices come from poe.ninja and the trade site, and are never more than 15 minutes old."
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
      aside={
        <ScarabPrices
          scarabs={scarabs}
          divine={divine}
          mirror={mirrorInDivine}
          mirrorChaos={mirror}
        />
      }
    >
      <JsonLd
        data={webAppLd({
          name: "PoE Bestiary beast prices and regex",
          path: `/beasts/${leagueSlug(league)}`,
          description:
            "Live Path of Exile beast prices with a generated Bestiary search for the captures worth selling.",
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Path of Exile tools", path: "/" },
          { name: "Bestiary prices", path: `/beasts/${leagueSlug(league)}` },
        ])}
      />

      <BeastTable beasts={beasts} league={league} fetchedAt={fetchedAt} />

      <FaqSection
        faqs={BEASTS_FAQ}
        className="border-border/60 mt-12 border-t pt-8"
      />
    </PageFrame>
  );
}
