/**
 * What each tool of this site does and the steps to use it.
 *
 * Rendered on /about above the questions about each tool, and repeated in
 * /llms.txt and /llms-full.txt, so the page and the files an agent reads say
 * the same thing. Written in the voice of the blurbs in nav.ts: short, plain,
 * facts only. Every line describes what the code does today.
 */
export type ToolGuide = {
  /** The first segment of the tool's URL, as in nav.ts. */
  slug: string;
  /** The heading on /about. */
  title: string;
  /** What the tool is, in one line. */
  about: readonly string[];
  /** The steps to use it, one short line each. */
  steps: readonly string[];
};

export const GUIDES: readonly ToolGuide[] = [
  {
    slug: "beasts",
    title: "Beast Regex",
    about: [
      "Beast prices for your league, and the Bestiary searches to sell or release them by value.",
    ],
    steps: [
      "Pick your league.",
      "Choose Sell or Trash and a chaos threshold.",
      "Copy each search in the order shown into the Bestiary search field.",
      "In Sell mode, red releases the cheap beasts in the way, green shows the ones to sell, blue (when shown) is the pile at exactly the threshold, for bulk.",
    ],
  },
  {
    slug: "scarabs",
    title: "Scarab Nodes",
    about: [
      "Atlas passives for one scarab family, ranked by what the next scarab of that family is worth.",
    ],
    steps: [
      "Pick your league.",
      "Turn content off: the top card costs you the least scarab value.",
      "Double drop chance: the top card is the family worth the most per drop.",
    ],
  },
  {
    slug: "maps",
    title: "Map Regex",
    about: [
      "Stash search that dims maps with the mods your build cannot run.",
    ],
    steps: [
      "Tick the mods you cannot run.",
      "Set minimum quantity, rarity or pack size if you want.",
      "Copy the search into the search field of your map stash tab.",
    ],
  },
  {
    slug: "leveling",
    title: "Leveling Guide",
    about: [
      "Windows overlay for the campaign. Shows the next step in game and moves on when you change zone.",
    ],
    steps: [
      "Download the installer or the portable zip.",
      "Start Path of Exile, then the app.",
      "Click Start.",
    ],
  },
];

export function guideFor(slug: string): ToolGuide {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) throw new Error(`No guide for /${slug}`);
  return guide;
}
