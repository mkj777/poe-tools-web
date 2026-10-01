import type { Faq } from "./seo.ts";

/**
 * The questions the site gets, answered on /about and nowhere else.
 *
 * Grouped by the tool they are about. The palette indexes them there, and
 * /llms-full.txt repeats them word for word.
 *
 * Only what a player needs and the page does not already show: where the
 * numbers come from, what is stored, what the app needs. One or two short
 * sentences each, facts only. What the Bestiary and stash search fields do
 * comes from the in game testing in `docs/bestiary-search.md` and
 * `docs/stash-search.md`.
 */
export const HOME_FAQ: readonly Faq[] = [
  {
    question: "Where do the prices come from?",
    answer:
      "poe.ninja, re-read every 15 minutes. Beasts poe.ninja does not list are priced from a snapshot of the official trade site, updated with the site.",
  },
  {
    question: "Which game and league?",
    answer:
      "Path of Exile 1 only. Any league poe.ninja lists, picked on the page; a plain link opens the first one.",
  },
  {
    question: "Is anything stored?",
    answer:
      "No account. A few settings, like Sell or Trash and recent searches, stay in your browser. Page views are counted by Vercel Analytics, without cookies.",
  },
];

export const BEASTS_FAQ: readonly Faq[] = [
  {
    question: "Why are there several searches?",
    answer:
      "The Bestiary search field holds 249 characters. A longer search is split into several, never cut off.",
  },
  {
    question: "Can Trash release a beast above the threshold?",
    answer:
      "No. A Trash search never shows a beast worth the threshold or more, even if that takes extra searches.",
  },
];

export const MAPS_FAQ: readonly Faq[] = [
  {
    question: "How does the stash search work?",
    answer:
      "Spaces split it into terms and every term has to match. A term starting with ! must match nothing on the map.",
  },
  {
    question: "Does the search change between leagues?",
    answer: "No. Map mods stay the same; only the prices beside it change.",
  },
];

export const SCARABS_FAQ: readonly Faq[] = [
  {
    question: "How is a family valued?",
    answer:
      "Each scarab's poe.ninja price, weighted by how often its rarity tier drops. That is what the next scarab of the family is worth.",
  },
  {
    question: "Where do the drop rates come from?",
    answer:
      "GGG has not published them. The weights are medians from about 33,000 vendor recipes a player logged in 3.27, linked from the wiki.",
  },
  {
    question: "Do the scarabs still drop if I turn the content off?",
    answer:
      "No. Eleven of the twelve nodes also stop that family dropping. Straight and Narrow turns off Smuggler's Caches, which have no scarabs.",
  },
];

export const LEVELING_FAQ: readonly Faq[] = [
  {
    question: "How does it know where I am?",
    answer:
      "It reads zone changes from the game's Client.txt log. The path is taken from the running game, or picked by hand.",
  },
  {
    question: "Do I need to import a build or a route?",
    answer:
      "No. The route is the Exile Leveling walkthrough, downloaded on first start and stored locally.",
  },
  {
    question: "What are the hotkeys?",
    answer:
      "Ctrl+Shift+Alt+Right next step, Ctrl+Shift+Alt+Left previous step, Ctrl+Shift+Alt+O move the overlay, Ctrl+Alt+0 close it.",
  },
];

/**
 * The groups on /about, in the order they are shown. Map Regex is unlisted, so
 * MAPS_FAQ is kept but not shown, and the palette does not offer it either.
 * `id` is the section's
 * anchor there and the prefix of every question's anchor; a tool's group
 * shares the tool's slug, so its guide in guides.ts sits in the same section.
 */
export const FAQ_GROUPS: readonly {
  id: string;
  title: string;
  faqs: readonly Faq[];
}[] = [
  { id: "general", title: "General", faqs: HOME_FAQ },
  { id: "beasts", title: "Beast Regex", faqs: BEASTS_FAQ },
  { id: "scarabs", title: "Scarab Nodes", faqs: SCARABS_FAQ },
  { id: "leveling", title: "Leveling Guide", faqs: LEVELING_FAQ },
];

/** The id a question wears on /about: zero based in, one based out. */
export function faqAnchor(group: string, index: number) {
  return `faq-${group}-${index + 1}`;
}
