import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { Reveal } from "@/components/reveal";
import { ToolIcon } from "@/components/tool-icon";
import { HOME_FAQ } from "@/lib/faq";
import { SIDEBAR, toolHref, type SidebarEntry } from "@/lib/nav";
import { getLeagues, leagueSlug } from "@/lib/ninja";
import { toolListLd } from "@/lib/seo";
import { OG_IMAGE, SITE_DESCRIPTION, canonical } from "@/lib/site";

export const metadata: Metadata = {
  // Absolute, because the template would append the name of the site to a
  // title that is already the name of the site plus what it does.
  title: { absolute: "Path of Exile Tools: Every PoE Tool Worth Using" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    url: canonical("/"),
    title: "Path of Exile Tools: Every PoE Tool Worth Using",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/** The league in the links out is whichever one poe.ninja lists first. */
export const revalidate = 900;

const group = (id: string) => {
  const found = SIDEBAR.find((g) => g.id === id);
  if (!found) throw new Error(`No sidebar group ${id}`);
  return found;
};

/**
 * One tool, said properly.
 *
 * The sidebar has four words for each of these and that is right for a column
 * you scan. A page somebody landed on looking for "path of exile tools" is the
 * other case: it has to be worth reading, which means a sentence per tool and
 * a link that goes straight there.
 */
function ToolCard({
  entry,
  league,
  slug,
}: {
  entry: SidebarEntry;
  league: string;
  slug: string;
}) {
  const external = entry.kind === "link";
  const tool = entry.kind === "link" ? entry.link : entry.page;
  const name = entry.kind === "link" ? entry.link.name : entry.page.label;
  const href =
    entry.kind === "link"
      ? entry.link.href(league)
      : toolHref(entry.page, slug);

  const inside = (
    <>
      <ToolIcon icon={tool.icon} className="mt-0.5 size-8" />
      <span className="min-w-0">
        <span className="flex items-center gap-1 font-medium">
          {name}
          {external && (
            <ArrowUpRight className="text-muted-foreground size-3.5 -translate-x-0.5 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-70" />
          )}
        </span>
        <span className="text-muted-foreground mt-1 block text-sm text-pretty">
          {tool.about}
        </span>
      </span>
    </>
  );

  const className =
    "group border-border/60 bg-card/40 hover:border-border hover:bg-card focus-visible:ring-ring flex h-full items-start gap-3 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-2";

  return (
    <li>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {inside}
        </a>
      ) : (
        <Link href={href} className={className}>
          {inside}
        </Link>
      )}
    </li>
  );
}

function Section({
  id,
  title,
  lead,
  entries,
  league,
  slug,
  delay,
}: {
  id: string;
  title: string;
  lead: string;
  entries: readonly SidebarEntry[];
  league: string;
  slug: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="mt-10 first:mt-0">
      <section aria-labelledby={id}>
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
          {lead}
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 rail:grid-cols-3">
          {entries.map((entry) => (
            <ToolCard
              key={entry.kind === "link" ? entry.link.name : entry.page.slug}
              entry={entry}
              league={league}
              slug={slug}
            />
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

/**
 * The directory, as a page rather than as a column.
 *
 * This used to redirect to the beasts, which cost the site the one URL every
 * link to it points at and left nothing at all to be found by anybody typing
 * "path of exile tools" into a search box. So the sidebar is now also a page:
 * every tool with a sentence saying what it is for, the ones built here first,
 * and the questions that bring people here answered underneath.
 */
export default async function Page() {
  // The links out that take a league want it spelled the way the game does,
  // and the ones in want the slug, so both come from the same list rather than
  // from each other: no slug can be turned back into "Hardcore Allflame".
  const leagues = await getLeagues().catch(() => []);
  const league = leagues[0]?.id ?? "Standard";
  const slug = leagueSlug(league);

  return (
    <PageFrame
      header={
        <PageHeader
          title="Path of Exile tools"
          description="Everything worth having in one list, and three of them built here. Beast prices and the Atlas exclusion costs read live from poe.ninja; the rest are the community tools a league is actually played with. No account, no ads, nothing to install unless you want the leveling overlay."
        />
      }
    >
      <JsonLd data={toolListLd()} />

      <Section
        id="built-here"
        title="Built here"
        lead="The Bestiary search the game asks for and nothing else generates well, what each Atlas exclusion costs you in scarabs, and the overlay that walks you through the campaign."
        entries={group("site").entries}
        league={league}
        slug={slug}
        delay={0}
      />

      <Section
        id="essentials"
        title="The essentials"
        lead="If you install nothing else, install these. Between them they cover planning a character, seeing your loot, pricing an item and buying it."
        entries={group("essentials").entries}
        league={league}
        slug={slug}
        delay={0.05}
      />

      <Section
        id="more-tools"
        title="Worth knowing about"
        lead="Narrower tools that are the best answer to one question each, from what your stash is worth to which timeless jewel seed you need."
        entries={group("more").entries}
        league={league}
        slug={slug}
        delay={0.1}
      />

      <Reveal delay={0.15}>
        <FaqSection
          faqs={HOME_FAQ}
          heading="Common questions"
          className="border-border/60 mt-12 border-t pt-8"
        />
      </Reveal>
    </PageFrame>
  );
}
