import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import { getAllScarabs, leagueSlug } from "@/lib/ninja";
import { SCARABS_FAQ } from "@/lib/faq";
import { BOOSTS, EXCLUSIONS, priceNodes } from "@/lib/scarab-nodes";
import { breadcrumbLd, webAppLd } from "@/lib/seo";
import { OG_IMAGE, canonical } from "@/lib/site";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { LeagueSelect } from "@/components/league-select";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ScarabNodes } from "@/components/scarab-nodes";

export async function generateMetadata({
  params,
}: PageProps<"/scarabs/[league]">): Promise<Metadata> {
  const slug = (await params).league;
  const { league } = await resolveLeague(slug);
  const name = league ?? slug;
  const path = `/scarabs/${slug}`;
  const title = `PoE Scarab Nodes: Atlas Passive Values (${name})`;
  const description = `The Atlas passives that switch a mechanic off, and the nine that make a family of scarabs drop more often, ranked by what those scarabs sell for in ${name}.`;

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
 * What each Atlas passive that touches a scarab family is worth.
 *
 * The passives themselves do not change with the league, and the mapping from
 * one to its family does not either. Only the prices do, which is the whole
 * reason this page carries a league.
 */
export default async function Page({ params }: PageProps<"/scarabs/[league]">) {
  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  // No prices means no page worth showing, but it is still a page: the
  // component says so itself rather than the route answering with a 404.
  const scarabs = await getAllScarabs(league).catch(() => []);
  const exclusions = priceNodes(scarabs, EXCLUSIONS);
  const boosts = priceNodes(scarabs, BOOSTS);

  return (
    <PageFrame
      header={
        <PageHeader
          title="Scarab Nodes"
          description="Economy of Scarab Nodes"
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
    >
      <JsonLd
        data={webAppLd({
          name: "PoE scarab nodes priced by Atlas passive",
          path: `/scarabs/${leagueSlug(league)}`,
          description:
            "Ranks the Atlas passives that disable a mechanic or find its scarabs by what those scarabs are worth.",
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Path of Exile tools", path: "/" },
          { name: "Scarab nodes", path: `/scarabs/${leagueSlug(league)}` },
        ])}
      />

      <ScarabNodes exclusions={exclusions} boosts={boosts} />

      <FaqSection
        faqs={SCARABS_FAQ}
        className="border-border/60 mt-12 border-t pt-8"
      />
    </PageFrame>
  );
}
