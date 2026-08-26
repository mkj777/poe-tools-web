import { notFound } from "next/navigation";
import { resolveLeague } from "@/lib/league";
import { SiteNav } from "@/components/site-nav";

/** Same window as the pages under it, so a new league appears in the bar. */
export const revalidate = 900;

export default async function LeagueLayout({
  children,
  params,
}: LayoutProps<"/[league]">) {
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();

  return (
    <>
      <SiteNav league={league} />
      {children}
    </>
  );
}
