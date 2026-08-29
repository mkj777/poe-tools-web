import { leagueSlug } from "./ninja.ts";

/**
 * What an entry wears in the sidebar: the item out of the game, or the tool's
 * own mark, because that is what a player recognises before they have read the
 * label.
 *
 * Every entry has one now. A file in `public/`, and `rounded` for a square mark
 * that would otherwise sit in the column as a hard tile.
 */
export type ToolIcon = { src: string; rounded?: boolean };

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
  /**
   * The same thing said properly, for the directory on the home page.
   *
   * A column of four word blurbs is a good sidebar and a bad page: it tells
   * somebody who already knows these tools which one they wanted, and somebody
   * who does not nothing at all. This is the sentence that decides whether the
   * tool is the one they need, and it is also the only thing on the site a
   * search engine can read about a tool that lives somewhere else.
   */
  about: string;
  icon: ToolIcon;
  /** `league` is the name Path of Exile uses, for example "Hardcore Allflame". */
  href: (league: string) => string;
};

/** Ignores the league, because the tool has no notion of one. */
const fixed = (url: string) => () => url;

export const EXTERNAL_TOOLS: readonly ExternalTool[] = [
  {
    name: "Path of Building",
    blurb: "Crunch the numbers",
    about:
      "The offline build planner nearly every guide is written in. Import your character, try a change, and see what it does to your damage and your survivability before you spend a single orb on it.",
    icon: { src: "/pathofbuilding_logo.png", rounded: true },
    href: fixed("https://pathofbuilding.community/"),
  },
  {
    name: "FilterBlade",
    blurb: "Loot Filters",
    about:
      "NeverSink's loot filter, edited in the browser. Decide what is worth showing on the ground at your level of currency, then push the filter into the game and stop reading drops you were never going to pick up.",
    icon: { src: "/FilterBlade_logo.png", rounded: true },
    href: fixed("https://www.filterblade.xyz/?game=Poe1"),
  },
  {
    name: "Awakened PoE Trade",
    blurb: "Price check in game",
    about:
      "An overlay that prices whatever is under your cursor. One shortcut on an item and it searches the trade site for the same thing, so a price check costs a second rather than a trip out of the game.",
    icon: { src: "/awakened_poe_trade_logo.png", rounded: true },
    href: fixed("https://snosme.github.io/awakened-poe-trade/download"),
  },
  {
    name: "poe.ninja",
    blurb: "Builds and economy",
    about:
      "What the league is actually doing. Which builds people are playing and how far they have taken them, what every item is selling for, and what a currency was worth a week ago.",
    icon: { src: "/ninja-logo.webp", rounded: true },
    // The front page, which is both halves of the site. The league path it
    // used to be handed answers with nothing.
    href: fixed("https://poe.ninja"),
  },
  {
    name: "Trade",
    blurb: "Official trading market",
    about:
      "The official market, and the only one. Every listing is an item sitting in a stash tab somebody has made public, and the whisper it hands you is what buys it.",
    icon: { src: "/poe_trade_icon.svg" },
    href: (league) =>
      `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
  },
  {
    name: "Wealthy Exile",
    blurb: "What your stash is worth",
    about:
      "Reads your stash tabs and totals them at current prices, so you know what you are sitting on instead of guessing at it tab by tab.",
    icon: { src: "/wealthexile_ico.ico", rounded: true },
    href: fixed("https://wealthyexile.com/"),
  },
  {
    name: "PoE Antiquary",
    blurb: "Prices of past leagues",
    about:
      "Price history from leagues that have already ended. The one place to check whether a strategy actually paid the last time it was in the game, rather than whether it feels like it should.",
    // The .ico it arrived as carries an empty 256px frame beside the real
    // 32px one, and a browser reaches for the larger. This is the 32.
    icon: { src: "/antiquary.png", rounded: true },
    href: fixed("https://poe-antiquary.xyz/"),
  },
  {
    name: "Disenchanting",
    blurb: "Vendor or disenchant",
    about:
      "Answers the question every unique drop asks: is it worth more sold as it is, vendored, or turned into shards. Reads the current prices for the league you are in.",
    icon: { src: "/Disenchant.png" },
    // Its own paths are leagues, spelled the way poe.ninja spells them.
    href: (league) =>
      `https://poe-disenchant-tool.vercel.app/${leagueSlug(league)}`,
  },
  {
    name: "Timeless Jewels",
    blurb: "Seeds by passive socket",
    about:
      "Searches every timeless jewel seed for what it would turn a given passive socket into, which is the only way to find the one jewel that makes a build work.",
    icon: { src: "/Timeless_Jewel_inventory_icon.png" },
    href: fixed("https://vilsol.github.io/timeless-jewels"),
  },
  {
    name: "Cluster Jewels",
    blurb: "Roll the notables you want",
    about:
      "Works out which base, item level and passive count can roll the notables you are after, and how likely each attempt is to land them.",
    icon: { src: "/Medium_Cluster_Jewel_inventory_icon.png" },
    href: fixed("https://theodorejbieber.github.io/PoEClusterJewelCalculator/"),
  },
  {
    name: "PoE Regex",
    blurb: "Regex for everything",
    about:
      "A generator for the search strings the game keeps asking for: vendor windows, the currency exchange, heist, the atlas tree, and everything else with a field in it.",
    icon: { src: "/poere.ico", rounded: true },
    href: fixed("https://poe.re"),
  },
  {
    name: "PoELab",
    blurb: "Today's labyrinth layout",
    about:
      "Today's labyrinth, traced and drawn, with the trap rooms and the argus marked. A run becomes a map you follow rather than one you have to explore.",
    icon: { src: "/Labyrinth.webp" },
    href: fixed("https://www.poelab.com/"),
  },
];

export function toolByName(name: string) {
  const tool = EXTERNAL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`No external tool named ${name}`);
  return tool;
}
