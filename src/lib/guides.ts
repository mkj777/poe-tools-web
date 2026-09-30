/**
 * What each tool of this site does and how it is used, said in plain prose.
 *
 * Rendered on /about, the one page with prose on it, each above the questions
 * about its tool, and repeated in /llms.txt and /llms-full.txt, so the page
 * and the files an agent reads say the same thing. Every sentence here describes what the code does today:
 * a feature is named only once it ships.
 */
export type ToolGuide = {
  /** The first segment of the tool's URL, as in nav.ts. */
  slug: string;
  /** The name a player searches for, for the heading and the llms.txt section. */
  title: string;
  /** What the tool is, in a paragraph or two. */
  about: readonly string[];
  /** How a session with it goes, one step each. */
  steps: readonly string[];
};

export const GUIDES: readonly ToolGuide[] = [
  {
    slug: "beasts",
    title: "Beast Regex: PoE Bestiary prices and search",
    about: [
      "Beast Regex lists every Path of Exile beast on the market for the league you pick, with its chaos value, its seven day change and how many are listed. Prices come from poe.ninja, and the official trade site fills in the beasts poe.ninja does not track.",
      "Set a minimum chaos value and the page writes the Bestiary searches for it. Sell mode finds every beast worth the threshold or more, Trash mode finds every beast below it and never one above. Each search fits the 249 character limit of the in game field; when the fragments do not fit, they are split across several searches instead of being cut off.",
    ],
    steps: [
      "Pick the league you play in.",
      "Choose Sell or Trash, then a threshold: one of the presets from 1 to 5 chaos or any number you type.",
      "Copy each search in the order shown and paste it into the search field of the Bestiary window. In Sell mode a red step releases the few cheap beasts that would get in the way, a green step shows the ones to sell, and a blue step, when there is one, bulk sells the pile worth exactly the threshold.",
    ],
  },
  {
    slug: "scarabs",
    title: "Scarab Nodes: Atlas passives priced by their scarabs",
    about: [
      "Scarab Nodes prices the Atlas passives that concern one family of scarabs. Twelve notables switch a mechanic off, and eleven of them also stop its scarabs from dropping. Nine Carapace notables give scarabs dropped in your maps a 100% increased chance to be of one family.",
      "Every passive is ranked by what the next scarab of its family is worth: the poe.ninja currency exchange price of each scarab, weighted by how often its rarity tier drops. The content to turn off is listed cheapest first, since that is the least you give up, and the drop chance nodes dearest first.",
    ],
    steps: [
      "Pick the league, since only the prices change with it.",
      "Under Turn content off, the top of the list is the content that costs you the least scarab value to disable.",
      "Under Double drop chance, the top of the list is the family whose next drop is worth the most. Each card lists the scarabs of the family with their price and their share of the family's drops.",
    ],
  },
  {
    slug: "maps",
    title: "Map Regex: PoE map stash search generator",
    about: [
      "Map Regex writes the Path of Exile stash search that lights up the maps you can run and leaves the rest dark. Tick the map modifiers your build cannot handle and it builds one search that excludes all of them, cut from fragments that match nothing else on a map.",
      "Minimums for Item Quantity, Item Rarity and Monster Pack Size can be added to the same search, and one checkbox keeps unrolled white maps dark. The side panel shows the current scarab and astrolabe prices for the league.",
    ],
    steps: [
      "Tick the modifiers your character cannot run, or search for them in the game's own wording.",
      "Set any minimum quantity, rarity or pack size you want.",
      "Copy the search and paste it into the search field above your map stash tab. The maps that still light up are the ones to run.",
    ],
  },
  {
    slug: "leveling",
    title: "PoE Leveling Guide: a campaign overlay for Windows",
    about: [
      "The PoE Leveling Guide is a free, open source Windows app that draws the next campaign step inside the Path of Exile game window. It reads the zone changes the game writes to its Client.txt log and advances on its own, so you never alt tab to find your place in the guide.",
      "The route is the walkthrough from the Exile Leveling project, downloaded on first start and stored locally, so no build has to be imported. The app is built with Tauri on Kazte/path-of-levelling and released under the MIT licence.",
    ],
    steps: [
      "Download the installer, or the portable zip, and run it.",
      "Start Path of Exile, then the app. It finds Client.txt from the running game.",
      "Click Start. The overlay places itself in the game window and follows your progress through the acts.",
    ],
  },
];

export function guideFor(slug: string): ToolGuide {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) throw new Error(`No guide for /${slug}`);
  return guide;
}
