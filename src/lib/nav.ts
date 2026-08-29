import {
  EXTERNAL_TOOLS,
  toolByName,
  type ExternalTool,
  type ToolIcon,
} from "./tools.ts";

/**
 * What the sidebar lists of this site's own pages, and how their URLs are
 * built.
 *
 * A tool owns a first segment: /beasts, /maps, /leveling. The league is not one
 * of those segments any more. It belongs to the tools that read prices, which
 * carry it as a segment of their own and pick it on the page itself, so a tool
 * with no notion of a league does not have to carry one to exist.
 */
export type SiteTool = {
  /** The first segment of every URL the tool owns. */
  slug: string;
  label: string;
  /** A few words under the label, saying what the tool is for. */
  blurb: string;
  /** The same thing said properly, for the directory on the home page. */
  about: string;
  icon: ToolIcon;
  /** Reads prices, so its URL carries the league they were read for. */
  league?: boolean;
};

export const SITE_TOOLS: readonly SiteTool[] = [
  {
    slug: "beasts",
    label: "Beast Regex",
    blurb: "Sell Beasts efficiently",
    about:
      "Every beast on the market for the league you picked, with its chaos value, its seven day change and how many are listed. Set a threshold and it writes the Bestiary search that lights up the ones worth the trip.",
    icon: { src: "/Imprinted_Bestiary_Orb_inventory_icon.png" },
    league: true,
  },
  {
    slug: "maps",
    label: "Map Regex",
    blurb: "Filter maps in stash",
    about:
      "Tick the map modifiers your build cannot survive and get back the stash search that dims every map carrying one of them, short enough to paste into the field in one go.",
    icon: { src: "/Nightmare_Map_(Curse_of_the_Allflame)_inventory_icon.png" },
    league: true,
  },
  {
    slug: "leveling",
    label: "Leveling Guide",
    blurb: "Overlay for the campaign",
    about:
      "A Windows overlay that keeps the next campaign step in the game window and turns its own page when you change zone, so a leveling guide stops being a second monitor.",
    icon: { src: "/poe_leveling_guide_icon.png", rounded: true },
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

/** Which tool a path belongs to. Empty for a path that is none of them. */
export function activeTool(pathname: string) {
  const slug = parts(pathname)[0] ?? "";
  return toolBySlug(slug) ? slug : "";
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

/** A page of this site, or a link that leaves it. */
export type SidebarEntry =
  { kind: "page"; page: SiteTool } | { kind: "link"; link: ExternalTool };

export type SidebarGroup = {
  id: string;
  label: string;
  /**
   * Rolled up until it is asked for. Fifteen entries at once is a wall, and
   * only the first few are ones you reach for every session.
   */
  folded?: boolean;
  entries: readonly SidebarEntry[];
};

const page = (slug: string): SidebarEntry => {
  const tool = toolBySlug(slug);
  if (!tool) throw new Error(`No tool at /${slug}`);
  return { kind: "page", page: tool };
};

const link = (name: string): SidebarEntry => ({
  kind: "link",
  link: toolByName(name),
});

/**
 * The order the sidebar reads in, which is not the order either list is
 * declared in. First is what a session is spent in: the trade site, then the
 * three that run beside the client. Then the pages built here. Everything else
 * is folded away behind one heading and unfolds on it.
 */
export const SIDEBAR: readonly SidebarGroup[] = [
  {
    id: "essentials",
    label: "Essentials",
    entries: [
      link("Trade"),
      link("Path of Building"),
      link("FilterBlade"),
      link("Awakened PoE Trade"),
      link("PoE Regex"),
    ],
  },
  {
    id: "site",
    label: "This site",
    entries: [page("beasts"), page("maps"), page("leveling")],
  },
  {
    // Everything else, under one heading rather than sorted into three that
    // each held two or three entries. A folded group is a line either way.
    id: "more",
    label: "More tools",
    folded: true,
    entries: [
      link("poe.ninja"),
      link("Wealthy Exile"),
      link("PoE Antiquary"),
      link("Disenchanting"),
      link("Timeless Jewels"),
      link("Cluster Jewels"),
      link("PoELab"),
    ],
  },
];

/** Every entry the sidebar carries, in the order it carries them. */
export const SIDEBAR_ENTRIES = SIDEBAR.flatMap((group) => group.entries);

/**
 * A page that exists and is not listed. The Bestiary simulation still answers
 * at /beasts/<league>/simulation, and is linked to from nowhere: it is
 * unfinished, and a sidebar is a promise that what is in it is not.
 */
export const UNLISTED = ["simulation"] as const;

/** What the catalogue holds that the sidebar forgot. */
export function unlistedTools() {
  const listed = new Set(
    SIDEBAR_ENTRIES.flatMap((e) => (e.kind === "link" ? [e.link.name] : [])),
  );
  return EXTERNAL_TOOLS.filter((t) => !listed.has(t.name));
}
