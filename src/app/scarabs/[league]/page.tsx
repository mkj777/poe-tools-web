import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import { getAllScarabs, leagueSlug } from "@/lib/ninja";
import { SCARABS_FAQ } from "@/lib/faq";
import { priceMechanics, unclaimedScarabs } from "@/lib/scarab-exclusion";
import { breadcrumbLd, webAppLd } from "@/lib/seo";
import { OG_IMAGE, canonical } from "@/lib/site";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { LeagueSelect } from "@/components/league-select";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ScarabExclusion } from "@/components/scarab-exclusion";

export async function generateMetadata({
  params,
}: PageProps<"/scarabs/[league]">): Promise<Metadata> {
  const slug = (await params).league;
  const { league } = await resolveLeague(slug);
  const name = league ?? slug;
  const path = `/scarabs/${slug}`;
  const title = `PoE Scarab Prices by Atlas Keystone (${name})`;
  const description = `The Atlas keystones that switch a mechanic off, ranked by what their scarabs sell for in ${name}. See which content costs you the least to give up.`;

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

/** Same window poe.ninja recomputes its overviews in, as everywhere else. */
export const revalidate = 900;

export const generateStaticParams = leagueParams;

/**
 * What each content-disabling Atlas keystone costs you.
 *
 * The keystones themselves do not change with the league, and the mapping from
 * one to its scarabs does not either. Only the prices do, which is the whole
 * reason this page carries a league.
 */
export default async function Page({ params }: PageProps<"/scarabs/[league]">) {
  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  // No prices means no page worth showing, but it is still a page: the
  // component says so itself rather than the route answering with a 404.
  const scarabs = await getAllScarabs(league).catch(() => []);
  const mechanics = priceMechanics(scarabs);
  // Most scarabs belong to content that cannot be switched off at all, which
  // is worth saying once: the twelve are a small part of the scarab economy.
  const untouchable = unclaimedScarabs(scarabs).length;

  return (
    <PageFrame
      header={
        <PageHeader
          title="Scarab Exclusion"
          description="Every Atlas passive that takes a mechanic out of your maps, with the scarabs it takes with it. Whichever way you compare them, the cheapest content to give up is the one at the bottom."
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
    >
      <JsonLd
        data={webAppLd({
          name: "PoE scarab prices by Atlas keystone",
          path: `/scarabs/${leagueSlug(league)}`,
          description:
            "Ranks the content-disabling Atlas keystones by what the scarabs of the mechanic they disable are worth.",
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Path of Exile tools", path: "/" },
          { name: "Scarab exclusion", path: `/scarabs/${leagueSlug(league)}` },
        ])}
      />

      <ScarabExclusion mechanics={mechanics} />

      {untouchable > 0 && (
        <p className="text-muted-foreground mt-6 text-sm text-pretty">
          {untouchable} other priced scarabs belong to content no Atlas passive
          can switch off, so they are not part of the comparison.
        </p>
      )}

      <FaqSection
        faqs={SCARABS_FAQ}
        className="border-border/60 mt-12 border-t pt-8"
      />
    </PageFrame>
  );
}
