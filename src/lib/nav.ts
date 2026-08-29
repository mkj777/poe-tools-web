/**
 * What the sidebar lists of this site's own pages, and how their URLs are
 * built.
 *
 * A tool owns a first segment: /beasts, /maps, /leveling. The league is not one
 * of those segments any more. It belongs to the tools that read prices, which
 * carry it as a segment of their own and pick it on the page itself, so a tool
 * with no notion of a league does not have to carry one to exist.
 *
 * Nothing here imports an icon. The key is a string and the sidebar owns the
 * table from key to lucide component, which is what keeps this file plain
 * TypeScript that `node --test` can run.
 */
export type ToolIcon = "beasts" | "simulation" | "maps" | "leveling";

/** A page under a tool. Listed beneath it rather than beside it. */
export type SitePage = {
  slug: string;
  label: string;
  blurb: string;
  icon: ToolIcon;
};

export type SiteTool = {
  /** The first segment of every URL the tool owns. */
  slug: string;
  label: string;
  /** A few words under the label, saying what the tool is for. */
  blurb: string;
  icon: ToolIcon;
  /** Reads prices, so its URL carries the league they were read for. */
  league?: boolean;
  pages?: readonly SitePage[];
};

export const SITE_TOOLS: readonly SiteTool[] = [
  {
    slug: "beasts",
    label: "Beast Prices",
    blurb: "Every beast on the market",
    icon: "beasts",
    league: true,
    pages: [
      {
        slug: "simulation",
        label: "Bestiary Sim",
        blurb: "Try a search first",
        icon: "simulation",
      },
    ],
  },
  {
    slug: "maps",
    label: "Map Regex",
    blurb: "Stash search for maps",
    icon: "maps",
    league: true,
  },
  {
    slug: "leveling",
    label: "Leveling Guide",
    blurb: "Overlay for the campaign",
    icon: "leveling",
  },
] as const;

/** The tool a bare visit lands on. */
export const HOME = SITE_TOOLS[0];

const parts = (pathname: string) => pathname.split("/").filter(Boolean);

export function toolBySlug(slug: string) {
  return SITE_TOOLS.find((t) => t.slug === slug);
}

/**
 * Where a tool lives. A league tool without a league given falls back to its
 * bare path, which is the one that resolves the league itself.
 */
export function toolHref(tool: SiteTool, league?: string) {
  return tool.league && league ? `/${tool.slug}/${league}` : `/${tool.slug}`;
}

/** A page of a tool. The league is required, because the path has room for it. */
export function pageHref(tool: SiteTool, page: SitePage, league: string) {
  return `${toolHref(tool, league)}/${page.slug}`;
}

/** Which tool a path belongs to. Empty for a path that is none of them. */
export function activeTool(pathname: string) {
  const slug = parts(pathname)[0] ?? "";
  return toolBySlug(slug) ? slug : "";
}

/** Which page under that tool. Empty when the path is the tool itself. */
export function activePage(pathname: string) {
  const tool = toolBySlug(activeTool(pathname));
  if (!tool) return "";
  const slug = parts(pathname)[tool.league ? 2 : 1] ?? "";
  return tool.pages?.some((p) => p.slug === slug) ? slug : "";
}

/** The league a path is looking at. Empty when its tool carries none. */
export function leagueFromPath(pathname: string) {
  const tool = toolBySlug(activeTool(pathname));
  if (!tool?.league) return "";
  return parts(pathname)[1] ?? "";
}

/** The same page in another league, which is what the league select means. */
export function swapLeague(pathname: string, next: string) {
  const tool = toolBySlug(activeTool(pathname));
  if (!tool?.league) return pathname || "/";
  const segments = parts(pathname);
  segments[1] = next;
  return `/${segments.join("/")}`;
}
