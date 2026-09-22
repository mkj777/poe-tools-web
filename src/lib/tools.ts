import { leagueSlug } from "./ninja.ts";
import type { TopicId } from "./topics.ts";

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
  /** The subjects it has to do with, which the search reads. See topics.ts. */
  topics: readonly TopicId[];
  /**
   * What a player types for it that the name does not say: the abbreviation,
   * the author, the thing it is known for. Spelled the way they would be shown,
   * because the palette names the one that matched.
   */
  aliases?: readonly string[];
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
      "THE build planner. Opens and edits the PoB link every guide comes as, and imports your character from the game.",
    icon: { src: "/pathofbuilding_logo.png", rounded: true },
    topics: ["builds", "skill-tree", "desktop"],
    aliases: [
      "PoB",
      "PoB Community",
      "Path of Building Community",
      "Build planner",
      "DPS calculator",
    ],
    href: fixed("https://pathofbuilding.community/"),
  },
  {
    name: "FilterBlade",
    blurb: "Loot Filters",
    about:
      "A must have. Customise and adjust the in game loot filter, very accessible and well made.",
    icon: { src: "/FilterBlade_logo.png", rounded: true },
    topics: ["loot-filter"],
    aliases: ["NeverSink", "NeverSink filter", "Loot filter", "Item filter"],
    href: fixed("https://www.filterblade.xyz/?game=Poe1"),
  },
  {
    name: "Awakened PoE Trade",
    blurb: "Price check in game",
    about:
      "Hotkey price check in game, no alt tab to the trade site. Essential, pricing drops would take forever without it.",
    icon: { src: "/awakened_poe_trade_logo.png", rounded: true },
    topics: ["prices", "trade", "overlay", "desktop"],
    aliases: ["APT", "Awakened Trade", "Price check", "Price checker"],
    href: fixed("https://snosme.github.io/awakened-poe-trade/download"),
  },
  {
    name: "poe.ninja",
    blurb: "Builds and economy",
    about:
      "The best place to see the current meta, what players build for a mechanic, and the economy behind it.",
    icon: { src: "/ninja-logo.webp", rounded: true },
    topics: ["builds", "prices", "currency", "skill-tree", "history"],
    aliases: [
      "Ninja",
      "poeninja",
      "Economy",
      "Builds ladder",
      "Currency rates",
    ],
    // The front page, which is both halves of the site. The league path it
    // used to be handed answers with nothing.
    href: fixed("https://poe.ninja"),
  },
  {
    name: "Trade",
    blurb: "Official trading market",
    about:
      "The official market, also accessible in game. The website is worth using for specific searches.",
    icon: { src: "/poe_trade_icon.svg" },
    topics: ["trade", "prices", "currency"],
    aliases: [
      "Trade site",
      "Official trade",
      "PoE Trade",
      "Bulk exchange",
      "pathofexile.com",
    ],
    href: (league) =>
      `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
  },
  {
    name: "Wealthy Exile",
    blurb: "What your stash is worth",
    about:
      "Totals your stash at current prices and tracks your net worth. Some items come out overvalued, still very useful.",
    icon: { src: "/wealthexile_ico.ico", rounded: true },
    topics: ["stash", "prices"],
    aliases: ["Net worth", "Stash value", "Stash worth", "Wealth"],
    href: fixed("https://wealthyexile.com/"),
  },
  {
    name: "PoE Antiquary",
    blurb: "Prices of past leagues",
    about:
      "Price history from past leagues. Useful for guessing what an item will be worth a week from now.",
    // The .ico it arrived as carries an empty 256px frame beside the real
    // 32px one, and a browser reaches for the larger. This is the 32.
    icon: { src: "/antiquary.png", rounded: true },
    topics: ["prices", "history", "currency"],
    aliases: ["Antiquary", "Price history", "Past leagues", "League history"],
    href: fixed("https://poe-antiquary.xyz/"),
  },
  {
    name: "Disenchanting",
    blurb: "Vendor or disenchant",
    about:
      "Useful for getting dust: the best chaos to dust ratios, and which uniques are worth more sold.",
    icon: { src: "/Disenchant.png" },
    topics: ["vendor", "prices", "currency"],
    aliases: [
      "Disenchant",
      "Vendor or disenchant",
      "Unique disenchant",
      "Disenchant calculator",
    ],
    // Its own paths are leagues, spelled the way poe.ninja spells them.
    href: (league) =>
      `https://poe-disenchant-tool.vercel.app/${leagueSlug(league)}`,
  },
  {
    name: "Timeless Jewels",
    blurb: "Seeds by passive socket",
    about:
      "Which timeless jewel seed does what to the passives around your socket, searchable by what you need.",
    icon: { src: "/Timeless_Jewel_inventory_icon.png" },
    topics: ["jewels", "skill-tree"],
    aliases: [
      "Timeless jewel",
      "Timeless calculator",
      "Seed",
      "Seeds",
      "Legion jewel",
      "Glorious Vanity",
      "Lethal Pride",
      "Brutal Restraint",
      "Militant Faith",
      "Elegant Hubris",
    ],
    href: fixed("https://vilsol.github.io/timeless-jewels"),
  },
  {
    name: "Cluster Jewels",
    blurb: "Roll the notables you want",
    about:
      "Which cluster jewel base and item level can roll the notables you want, and the odds.",
    icon: { src: "/Medium_Cluster_Jewel_inventory_icon.png" },
    topics: ["jewels", "skill-tree", "crafting"],
    aliases: [
      "Cluster jewel",
      "Cluster calculator",
      "Cluster jewel calculator",
      "Large cluster",
      "Medium cluster",
      "Small cluster",
      "Notable weights",
    ],
    href: fixed("https://theodorejbieber.github.io/PoEClusterJewelCalculator/"),
  },
  {
    name: "PoE Regex",
    blurb: "Regex for everything",
    about:
      "Regexes for every use case. No more hovering over every item when buying, selling or searching.",
    icon: { src: "/poere.ico", rounded: true },
    topics: ["regex", "stash", "vendor"],
    aliases: [
      "poe.re",
      "Regex generator",
      "Vendor regex",
      "Heist regex",
      "Atlas regex",
      "Gwennen",
      "Flask regex",
      "Gem regex",
      "Expedition regex",
    ],
    href: fixed("https://poe.re"),
  },
  {
    name: "PoELab",
    blurb: "Today's labyrinth layout",
    about:
      "Today's labyrinth layouts, the same for everyone and new every day. Good if you hate finding the way yourself.",
    icon: { src: "/Labyrinth.webp" },
    topics: ["labyrinth"],
    aliases: [
      "Lab layout",
      "Labyrinth layout",
      "Daily lab",
      "Uber lab",
      "Izaro",
      "Lab notes",
    ],
    href: fixed("https://www.poelab.com/"),
  },
  {
    name: "Maxroll",
    blurb: "Builds and game guides",
    about:
      "The best written build guides, plus guides to leagues, mechanics, crafting and bosses.",
    icon: { src: "/maxroll_logo.svg" },
    topics: ["builds", "guides"],
    aliases: [
      "Maxroll PoE",
      "Build guides",
      "Game guides",
      "Mechanics guides",
      "League starters",
    ],
    href: fixed("https://maxroll.gg/poe"),
  },
  {
    name: "Exile Leveling",
    blurb: "Act by act leveling route",
    about:
      "The source of the Leveling Guide's route, if you would rather have the steps open in a browser.",
    icon: { src: "/exile_leveling_icon.png", rounded: true },
    topics: ["leveling", "campaign"],
    aliases: [
      "heartofphos",
      "Leveling route",
      "Act guide",
      "Campaign route",
      "Passive points",
    ],
    href: fixed("https://heartofphos.github.io/exile-leveling/"),
  },
];

export function toolByName(name: string) {
  const tool = EXTERNAL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`No external tool named ${name}`);
  return tool;
}
