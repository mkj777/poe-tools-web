import { notFound } from "next/navigation";
import { hasListing, loadBeasts } from "@/lib/beasts";
import { leagueParams, resolveLeague } from "@/lib/league";
import { BestiarySimulator } from "@/components/bestiary-simulator";
import { LeagueSelect } from "@/components/league-select";
import { PageFrame, PageHeader } from "@/components/page-frame";

export const metadata = {
  title: "Bestiary Sim",
  description: "Try a Bestiary search against every beast that has a listing.",
  // Unfinished, and in no menu because of it. A page nobody is sent to should
  // not be a page anybody is sent to by a search engine either. Crawling stays
  // allowed, because a robots.txt ban would hide this line rather than obey it.
  robots: { index: false, follow: true },
};

/** Same beasts, same 15 minute window as the prices page. */
export const revalidate = 900;

export const generateStaticParams = leagueParams;

export default async function Page({
  params,
}: PageProps<"/beasts/[league]/simulation">) {
  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  // Only beasts the game still hands out. The rest can never show up in a
  // Bestiary window, so having them here would only mislead.
  const beasts = (await loadBeasts(league)).filter(hasListing);

  return (
    <PageFrame
      header={
        <PageHeader
          title="Bestiary Sim"
          description={`${beasts.length} beasts with a listing in ${league}, searched the way the game does, and priced, which the game will not do. An empty search shows all of them, as in game.`}
          actions={<LeagueSelect leagues={leagues} league={league} />}
        />
      }
    >
      <BestiarySimulator beasts={beasts} />
    </PageFrame>
  );
}
