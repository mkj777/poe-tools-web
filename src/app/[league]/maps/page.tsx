import { notFound } from "next/navigation";
import { leagueParams, resolveLeague } from "@/lib/league";
import { MapSearch } from "@/components/map-search";
import { PageFrame } from "@/components/page-frame";

export const metadata = {
  title: "Map Regex",
  description:
    "Build the stash search that highlights the maps you can actually run.",
};

export const generateStaticParams = leagueParams;

export default async function Page({ params }: PageProps<"/[league]/maps">) {
  // Map modifiers do not change with the league. The segment is here so the tab
  // bar and the league switcher keep working without a special case.
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();

  return (
    <PageFrame>
      <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12">
        <header className="mb-6 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Map Regex</h1>
          <p className="text-muted-foreground">
            Tick what your build cannot run. What comes out highlights every map
            carrying none of it, so anything left dark is what needs work.
          </p>
        </header>

        <MapSearch />
      </main>
    </PageFrame>
  );
}
