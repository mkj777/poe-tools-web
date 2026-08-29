import { notFound, redirect } from "next/navigation";
import { resolveLeague } from "@/lib/league";
import { leagueSlug } from "@/lib/ninja";

/**
 * Where the beasts used to live, back when every URL of this site began with a
 * league. Bookmarks and links from that time still land here, so they are sent
 * on to the tool that page has become. The tools reached from the sidebar are
 * static segments, so they are matched before this one ever is.
 */
export const revalidate = 900;

export default async function Page({ params }: PageProps<"/[league]">) {
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();
  redirect(`/beasts/${leagueSlug(league)}`);
}
