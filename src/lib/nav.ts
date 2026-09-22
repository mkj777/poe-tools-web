import {
  EXTERNAL_TOOLS,
  toolByName,
  type ExternalTool,
  type ToolIcon,
} from "./tools.ts";
import type { TopicId } from "./topics.ts";

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
  /** The subjects it has to do with, which the search reads. See topics.ts. */
  topics: readonly TopicId[];
  /**
   * What a player types for it that the name does not say: the abbreviation,
   * the author, the thing it is known for. Spelled the way they would be shown,
   * because the palette names the one that matched.
   */
  aliases?: readonly string[];
  /** Reads prices, so its URL carries the league they were read for. */
  league?: boolean;
  /**
   * Rendered per visit rather than built ahead, so a link to it can only
   * fetch its loading state in advance, not the page.
   *
   * The distinction decides how a link prefetches. Next fetches a route with
   * a loading state only down to that state unless the link asks for the
   * whole route, and it does so even when the route is static, so the built
   * pages ask for the whole route to stay as immediate as they were. A page
   * rendered per visit must not: the whole route would be rendered for every
   * sidebar in every viewport and thrown away, since it goes stale at once.
   */
  live?: boolean;
  /**
   * Answers at its URL and appears in no menu, no directory and no card.
   *
   * Not the same as gone: the page is built, linked to from outside and listed
   * in the sitemap, so a bookmark and a search result both still land on it.
   * It is simply not something the site offers you.
   */
  unlisted?: boolean;
};

export const SITE_TOOLS: readonly SiteTool[] = [
  {
    slug: "beasts",
    label: "Beast Regex",
    blurb: "Sell Beasts efficiently",
    about:
      "Built to sell beasts faster. The Bestiary search is complicated, and clearing it takes a newbie a long time.",
    icon: { src: "/Imprinted_Bestiary_Orb_inventory_icon.png" },
    topics: ["bestiary", "regex", "prices"],
    aliases: ["Beasts", "Bestiary regex", "Bestiary search", "Beast prices"],
    league: true,
    live: true,
  },
  {
    slug: "maps",
    label: "Map Regex",
    blurb: "Filter maps in stash",
    // Reachable at /maps/<league> and from nowhere on the site.
    unlisted: true,
    about:
      "Tick the map mods your build cannot run and get the stash search that dims them.",
    icon: { src: "/Nightmare_Map_(Curse_of_the_Allflame)_inventory_icon.png" },
    topics: ["maps", "regex", "stash"],
    aliases: ["Map mods", "Map search", "Stash regex", "Map stash search"],
    league: true,
  },
  {
    slug: "scarabs",
    label: "Scarab Nodes",
    blurb: "Economy of Scarab Nodes",
    about:
      "Roughly which scarab nodes are best and which to exclude, for the spare points on your Atlas tree.",
    icon: { src: "/Kalguuran_Scarab_inventory_icon.png" },
    topics: ["scarabs", "atlas", "prices"],
    aliases: [
      "Scarab prices",
      "Atlas passives",
      "Atlas keystones",
      "Carapaces",
      "Scarab farming",
    ],
    league: true,
  },
  {
    slug: "leveling",
    label: "Leveling Guide",
    blurb: "Overlay for the campaign",
    about:
      "Campaign overlay: the next step shows in game and advances on its own. Great for speedrunning.",
    icon: { src: "/poe_leveling_guide_icon.png", rounded: true },
    topics: ["leveling", "campaign", "overlay", "desktop"],
    aliases: [
      "PoE Leveling Guide",
      "Leveling overlay",
      "Path of Levelling",
      "Campaign guide",
    ],
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

/**
 * What a link to the tool should fetch ahead, as next/link's `prefetch`
 * takes it: the whole route for a built page, the default (its loading state)
 * for one rendered per visit. See `live`.
 */
export function toolPrefetch(tool: SiteTool | undefined) {
  return tool?.live ? undefined : true;
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
  entries: readonly SidebarEntry[];
};

const page = (slug: string): SidebarEntry => {
  const tool = toolBySlug(slug);
  if (!tool) throw new Error(`No tool at /${slug}`);
  if (tool.unlisted) throw new Error(`/${slug} is unlisted`);
  return { kind: "page", page: tool };
};

const link = (name: string): SidebarEntry => ({
  kind: "link",
  link: toolByName(name),
});

/**
 * The order the sidebar reads in, which is not the order either list is
 * declared in, and the order the home page reads in too: both draw from this
 * one list, so they cannot disagree.
 *
 * Three headings, all open. Essentials is what a session is spent in: the
 * trade site, the three that run beside the client, and the regex generator.
 * General is what every character reaches for at some point, whatever it
 * farms: the economy, the guides, the game's data and the trees, what the
 * stash is worth, the campaign. Specific is one tool for one mechanic.
 * Within a heading the order is by subject rather than by who built it. The
 * pages of this site sit among the rest, where the subject puts them, and wear
 * a small tag saying they are built here.
 *
 * Two tools that answer the same question share a row on the home page, Wealthy
 * Exile with Exilence and the Leveling Guide with Exile Leveling. That page
 * lays a heading out two and three to a row, so the first of a pair stands at
 * an index both leave at the start of a row or the middle of three: 0, 4 or 6.
 * A test holds the pairs there.
 */
export const SIDEBAR: readonly SidebarGroup[] = [
  {
    id: "essentials",
    label: "Essentials",
    entries: [
      link("Trade"),
      link("FilterBlade"),
      link("Awakened PoE Trade"),
      link("Path of Building"),
      link("PoE Regex"),
    ],
  },
  {
    id: "general",
    label: "General",
    entries: [
      link("poe.ninja"),
      link("Maxroll"),
      link("PoEDB"),
      link("PoE Planner"),
      link("Wealthy Exile"),
      link("Exilence"),
      page("leveling"),
      link("Exile Leveling"),
    ],
  },
  {
    id: "specific",
    label: "Specific",
    entries: [
      page("beasts"),
      page("scarabs"),
      link("PoE Antiquary"),
      link("Disenchanting"),
      link("Timeless Jewels"),
      link("Cluster Jewels"),
      link("Craft of Exile"),
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

/** The pages this site builds and does not offer. */
export function unlistedPages() {
  return SITE_TOOLS.filter((t) => t.unlisted);
}

/** What the catalogue holds that the sidebar forgot. */
export function unlistedTools() {
  const listed = new Set(
    SIDEBAR_ENTRIES.flatMap((e) => (e.kind === "link" ? [e.link.name] : [])),
  );
  return EXTERNAL_TOOLS.filter((t) => !listed.has(t.name));
}
