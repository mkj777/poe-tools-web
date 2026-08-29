import { leagueSlug } from "./ninja.ts";

/**
 * A tool that lives somewhere else. This site does not try to rebuild what
 * these already do well: it points at them, and hands the ones that care the
 * league you are looking at.
 *
 * The list is long enough now that it reads as a directory rather than as a
 * menu, which is what the groups are for: you arrive knowing what you want to
 * do, not what the thing that does it is called.
 */
export type ToolGroup = "economy" | "planning" | "ingame";

/** Keyed rather than imported, for the same reason the site tools are. */
export type ExternalIcon =
  | "trade"
  | "ninja"
  | "wealth"
  | "antiquary"
  | "disenchant"
  | "pob"
  | "timeless"
  | "cluster"
  | "filter"
  | "pricecheck"
  | "regex"
  | "lab";

export type ExternalTool = {
  name: string;
  /** A few words under the name. What you would go there to do. */
  blurb: string;
  icon: ExternalIcon;
  group: ToolGroup;
  /** `league` is the name Path of Exile uses, for example "Hardcore Allflame". */
  href: (league: string) => string;
};

export const TOOL_GROUPS: readonly { id: ToolGroup; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "planning", label: "Planning" },
  { id: "ingame", label: "In game" },
] as const;

/** Ignores the league, because the tool has no notion of one. */
const fixed = (url: string) => () => url;

export const EXTERNAL_TOOLS: readonly ExternalTool[] = [
  {
    name: "Trade",
    blurb: "Official trade search",
    icon: "trade",
    group: "economy",
    href: (league) =>
      `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
  },
  {
    name: "poe.ninja",
    blurb: "The whole economy",
    icon: "ninja",
    group: "economy",
    // The same spelling this site uses in its own paths: /allflame, /allflamehc.
    href: (league) => `https://poe.ninja/poe1/economy/${leagueSlug(league)}`,
  },
  {
    name: "Wealthy Exile",
    blurb: "What your stash is worth",
    icon: "wealth",
    group: "economy",
    href: fixed("https://wealthyexile.com/"),
  },
  {
    name: "PoE Antiquary",
    blurb: "Prices of past leagues",
    icon: "antiquary",
    group: "economy",
    href: fixed("https://poe-antiquary.xyz/"),
  },
  {
    name: "Disenchanting",
    blurb: "Vendor or disenchant",
    icon: "disenchant",
    group: "economy",
    // Its own paths are leagues, spelled the way poe.ninja spells them.
    href: (league) =>
      `https://poe-disenchant-tool.vercel.app/${leagueSlug(league)}`,
  },
  {
    name: "Path of Building",
    blurb: "Plan a build offline",
    icon: "pob",
    group: "planning",
    href: fixed("https://pathofbuilding.community/"),
  },
  {
    name: "Timeless Jewels",
    blurb: "Seeds by passive socket",
    icon: "timeless",
    group: "planning",
    href: fixed("https://vilsol.github.io/timeless-jewels"),
  },
  {
    name: "Cluster Jewels",
    blurb: "Roll the notables you want",
    icon: "cluster",
    group: "planning",
    href: fixed("https://theodorejbieber.github.io/PoEClusterJewelCalculator/"),
  },
  {
    name: "FilterBlade",
    blurb: "Write a loot filter",
    icon: "filter",
    group: "ingame",
    href: fixed("https://www.filterblade.xyz/?game=Poe1"),
  },
  {
    name: "Awakened PoE Trade",
    blurb: "Price check in game",
    icon: "pricecheck",
    group: "ingame",
    href: fixed("https://snosme.github.io/awakened-poe-trade/download"),
  },
  {
    name: "PoE Regex",
    blurb: "Regex for every stash tab",
    icon: "regex",
    group: "ingame",
    href: fixed("https://poe.re"),
  },
  {
    name: "PoELab",
    blurb: "Today's labyrinth maps",
    icon: "lab",
    group: "ingame",
    href: fixed("https://www.poelab.com/"),
  },
];

/** The tools of one group, in the order the list declares them. */
export function toolsIn(group: ToolGroup) {
  return EXTERNAL_TOOLS.filter((t) => t.group === group);
}

export function toolByName(name: string) {
  const tool = EXTERNAL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`No external tool named ${name}`);
  return tool;
}
