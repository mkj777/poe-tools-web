import { leagueSlug } from "./ninja.ts";

/**
 * What an entry wears in the sidebar: the item out of the game, or the tool's
 * own mark, because that is what a player recognises before they have read the
 * label.
 *
 * `glyph` is the stand-in for an entry no asset exists for yet. It names a
 * lucide icon and the sidebar owns the table from that name to the component,
 * which is what keeps this file plain TypeScript. One entry is still on one.
 */
export type ToolIcon =
  { src: string; rounded?: boolean } | { glyph: GlyphName };

export type GlyphName = "antiquary";

/**
 * A tool that lives somewhere else. This site does not try to rebuild what
 * these already do well: it points at them, and hands the ones that care the
 * league you are looking at.
 *
 * This list is the catalogue. Which of them the sidebar shows first and which
 * it folds away is `SIDEBAR` in nav.ts.
 */
export type ExternalTool = {
  name: string;
  /** A few words under the name. What you would go there to do. */
  blurb: string;
  icon: ToolIcon;
  /** `league` is the name Path of Exile uses, for example "Hardcore Allflame". */
  href: (league: string) => string;
};

/** Ignores the league, because the tool has no notion of one. */
const fixed = (url: string) => () => url;

export const EXTERNAL_TOOLS: readonly ExternalTool[] = [
  {
    name: "Path of Building",
    blurb: "Test builds and crunch the numbers",
    icon: { src: "/pathofbuilding_logo.png", rounded: true },
    href: fixed("https://pathofbuilding.community/"),
  },
  {
    name: "FilterBlade",
    blurb: "Loot Filters",
    icon: { src: "/FilterBlade_logo.png", rounded: true },
    href: fixed("https://www.filterblade.xyz/?game=Poe1"),
  },
  {
    name: "Awakened PoE Trade",
    blurb: "Price check in game",
    icon: { src: "/awakened_poe_trade_logo.png", rounded: true },
    href: fixed("https://snosme.github.io/awakened-poe-trade/download"),
  },
  {
    name: "poe.ninja",
    blurb: "Builds and economy",
    icon: { src: "/ninja-logo.webp", rounded: true },
    // The front page, which is both halves of the site. The league path it
    // used to be handed answers with nothing.
    href: fixed("https://poe.ninja"),
  },
  {
    name: "Trade",
    blurb: "Official trading market",
    icon: { src: "/poe_trade_icon.svg" },
    href: (league) =>
      `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
  },
  {
    name: "Wealthy Exile",
    blurb: "What your stash is worth",
    icon: { src: "/wealthexile_ico.ico", rounded: true },
    href: fixed("https://wealthyexile.com/"),
  },
  {
    name: "PoE Antiquary",
    blurb: "Prices of past leagues",
    icon: { glyph: "antiquary" },
    href: fixed("https://poe-antiquary.xyz/"),
  },
  {
    name: "Disenchanting",
    blurb: "Vendor or disenchant",
    icon: { src: "/Disenchant.png" },
    // Its own paths are leagues, spelled the way poe.ninja spells them.
    href: (league) =>
      `https://poe-disenchant-tool.vercel.app/${leagueSlug(league)}`,
  },
  {
    name: "Timeless Jewels",
    blurb: "Seeds by passive socket",
    icon: { src: "/Timeless_Jewel_inventory_icon.png" },
    href: fixed("https://vilsol.github.io/timeless-jewels"),
  },
  {
    name: "Cluster Jewels",
    blurb: "Roll the notables you want",
    icon: { src: "/Medium_Cluster_Jewel_inventory_icon.png" },
    href: fixed("https://theodorejbieber.github.io/PoEClusterJewelCalculator/"),
  },
  {
    name: "PoE Regex",
    blurb: "Regexes for everything you need",
    icon: { src: "/poere.ico", rounded: true },
    href: fixed("https://poe.re"),
  },
  {
    name: "PoELab",
    blurb: "Today's labyrinth maps",
    icon: { src: "/Labyrinth.webp" },
    href: fixed("https://www.poelab.com/"),
  },
];

export function toolByName(name: string) {
  const tool = EXTERNAL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`No external tool named ${name}`);
  return tool;
}

/** The entries still wearing a stand-in rather than an icon of their own. */
export const WITHOUT_ICON = EXTERNAL_TOOLS.filter((t) => "glyph" in t.icon);
