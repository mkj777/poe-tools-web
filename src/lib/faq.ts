import type { Faq } from "./seo.ts";

/**
 * The questions the site gets, answered on /about and nowhere else.
 *
 * The owner wants the tool pages to be the tools and nothing more, so every
 * question lives on the one about page, grouped by the tool it is about. The
 * palette indexes them there, and /llms-full.txt repeats them word for word.
 *
 * Each answer is the question as somebody would type it and forty to sixty
 * words that settle it without a preamble: short enough for an answer engine
 * to lift whole.
 *
 * Nothing here is guessed. What the two search fields do comes from the in game
 * testing logged in `docs/bestiary-search.md` and `docs/stash-search.md`, which
 * is the one thing this site knows that no other page about it does.
 */
export const HOME_FAQ: readonly Faq[] = [
  {
    question: "What tools do you need for Path of Exile?",
    answer:
      "Five cover almost everything. The official trade site does the buying and selling, a FilterBlade loot filter decides what you see on the ground, Awakened PoE Trade price checks an item from inside the game, Path of Building plans the build, and PoE Regex writes the search strings the vendor, the stash and the Atlas keep asking for.",
  },
  {
    question: "Are these Path of Exile tools free?",
    answer:
      "Yes. Every tool listed here is free and community made, and most are open source. This site asks for no account, runs no ads and stores nothing about you. It is a directory with three tools of its own, not a service.",
  },
  {
    question: "Where do the prices on this site come from?",
    answer:
      "From the poe.ninja economy API for Path of Exile 1, which recomputes about every 15 minutes, with the official trade site filling in the beasts poe.ninja does not list. Values are shown in chaos, with the current divine rate beside them so you can convert.",
  },
  {
    question: "Do these tools work with Path of Exile 2?",
    answer:
      "The pages built here are Path of Exile 1 only, because the Bestiary and the map stash search are Path of Exile 1 things. Several of the linked tools do cover both: Path of Building and FilterBlade ship separate Path of Exile 2 versions, and Exiled Exchange 2 succeeds Awakened PoE Trade there.",
  },
];

export const BEASTS_FAQ: readonly Faq[] = [
  {
    question: "How do I find valuable beasts in Path of Exile?",
    answer:
      "Set a chaos threshold on this page and it writes the search for the beasts worth more than that. Paste it into the search field of the Bestiary window in your hideout and only those captures stay lit, so you can release the rest without reading a single name.",
  },
  {
    question: "Does the Bestiary search field accept a regex?",
    answer:
      "It does. Testing in game shows a real regex engine applied one line at a time, so alternation, groups, quantifiers, anchors and lookaheads all work, and a beast is shown when any single one of its lines matches. The field holds 249 characters and truncates at 250.",
  },
  {
    question: "What does the Bestiary search actually look at?",
    answer:
      "The beast type name, its genus and family, and the full text of every modifier it rolled, names and descriptions alike. That last part is why a careless fragment misfires: search for far and every beast holding Farric Presence comes back with it.",
  },
  {
    question: "How much are beasts worth in Path of Exile?",
    answer:
      "Most are worth close to nothing and a handful carry the whole trip. This page lists every beast on the market for the league you picked with its chaos value, its seven day change and how many are currently listed, sorted so the ones worth catching are at the top.",
  },
  {
    question: "How do I sell beasts in Path of Exile?",
    answer:
      "Pick Sell and a chaos threshold on this page and it hands you the searches in the order they are run: a red one that releases the few cheap beasts that would get in the way, a green one that lights up every beast worth the threshold or more, and a blue one for a pile worth exactly the threshold, to sell in bulk at one price.",
  },
  {
    question: "What regex do I paste into the Bestiary search for beasts?",
    answer:
      "The one this page writes for your league and threshold, since prices move and a fixed string goes stale. It is an alternation of short name fragments such as ^goatman$ or wine.r, each chosen to match no beast outside your selection, and it is split into several searches whenever it would pass the 249 character limit.",
  },
];

export const MAPS_FAQ: readonly Faq[] = [
  {
    question: "How do I use a regex in the Path of Exile stash?",
    answer:
      "Type it into the search field above an open stash tab and the maps that do not match go dim. Tick the modifiers your build cannot handle on this page and it writes the search for you, short enough to paste in one go.",
  },
  {
    question: "How does the Path of Exile stash search work?",
    answer:
      "Whitespace splits what you type into terms, and every term has to be satisfied, though not by the same line of the item. Each term is a regex tried line by line. Quotes let a term contain spaces, and a term starting with an exclamation mark must match nothing on the item, which is how exclusion works.",
  },
  {
    question: "Which map mods should you avoid?",
    answer:
      "That depends on the build, which is why this page asks instead of assuming. Tick the modifiers your character cannot survive and it writes the stash search that hides every map carrying one of them, short enough to paste into the field in one go.",
  },
  {
    question: "Do map modifiers change between leagues?",
    answer:
      "The modifier list itself does not, so the search you build here holds from one league to the next. The prices beside it do change, which is the only reason this page carries a league at all: the scarabs and the divine rate come from poe.ninja for the one you picked.",
  },
];

export const SCARABS_FAQ: readonly Faq[] = [
  {
    question: "Does the family worth the most chaos earn the most?",
    answer:
      "No. A family is worth what its next drop is worth, and the dearest scarab of a family is usually its rarest. Ultimatum holds the most expensive scarab in the game and still sits low on this page, because that scarab is one of only three the game marks at its rarest tier.",
  },
  {
    question: "Does rarity tier mean drop chance?",
    answer:
      "It is the drop chance. The wiki puts it plainly: a scarab's drop rate is decided by one of five internal rarity tiers, common, uncommon, rare, mythic and extreme. What the tier does not say is how often a scarab drops at all, which is a separate number nobody has published.",
  },
  {
    question: "How often does each tier drop?",
    answer:
      "Any single common scarab is about one in sixty of the scarabs you find, an uncommon one in ninety, a rare one in a hundred and seventy, a mythic one in fifteen hundred. Half of everything you pick up is common and under two percent of it is mythic or rarer.",
  },
  {
    question: "Where do those drop chances come from?",
    answer:
      "Not from GGG, which has published the five tiers and never a number for them. The ratios here are medians of the one measurement there is, thirty three thousand vendor recipes collected by a player in 3.27 and linked from the wiki, a recipe rolling on the same weights a drop does.",
  },
  {
    question: "Which Atlas content is cheapest to disable?",
    answer:
      "Straight and Narrow. Smuggler's Caches are the one mechanic of the twelve with no scarabs of their own, so nothing on the currency exchange is given up by switching Heist off. Every other answer moves with the league, which is what the prices on this page are for.",
  },
  {
    question: "What are the Atlas passives that disable map content?",
    answer:
      "Twelve notables, each carrying a line saying your maps have no chance to contain one mechanic. All twelve give back the same thing, word for word: your maps have a two percent better chance of containing the other kinds of content that an Atlas passive can turn off.",
  },
  {
    question: "Which Atlas passives increase scarab drop chance?",
    answer:
      "The nine Carapaces notables. Each gives scarabs dropped in your maps a 100% increased chance to belong to one family. Not one of them is named after the family it finds: Tainted is Beyond, Possessed is Torment, Trapping is Ambush, Outcasted is Anarchy, and Devoted is Domination.",
  },
  {
    question: "Are they Atlas keystones or notables?",
    answer:
      "Notables. Everybody calls them keystones, but not one of the twenty one carries the keystone flag in the Atlas tree data the game itself serves. The one real keystone here is Unwavering Vision, which stops scarabs being found in your maps at all and hands back twenty passive points.",
  },
  {
    question: "Do the scarabs still drop if I take the passive?",
    answer:
      "No. Eleven of the twelve carry a second line saying the scarabs found in your maps cannot be that mechanic's, so the whole family stops dropping for you. The twelfth, Straight and Narrow, needs no such line, because Smuggler's Caches have no scarabs to stop in the first place.",
  },
];

export const LEVELING_FAQ: readonly Faq[] = [
  {
    question: "What is a Path of Exile leveling overlay?",
    answer:
      "A small window drawn over the game that shows the next step of the campaign, so the guide is in front of you instead of on a second monitor. This one turns its own page when you change zone, which means you never alt tab to find your place again.",
  },
  {
    question: "Is the PoE Leveling Guide free?",
    answer:
      "Yes, and it is open source under the MIT licence. It is built on Kazte/path-of-levelling, runs on Windows, and is offered as an installer or a portable zip. There is no account and nothing to buy.",
  },
  {
    question: "How does the leveling overlay know where I am?",
    answer:
      "It reads the zone changes Path of Exile writes to its Client.txt log, so the guide turns to the next step as you move through the campaign. The route is the walkthrough from the Exile Leveling project, downloaded on first start and stored locally, so no build has to be imported.",
  },
  {
    question: "What are the hotkeys of the PoE Leveling Guide?",
    answer:
      "Ctrl, Shift and Alt with the right arrow go to the next step, and with the left arrow back one. Ctrl, Shift, Alt and O switch moving the overlay on and off, and Ctrl, Alt and 0 close it and return to the main window. Position, size and opacity are set in the app's settings.",
  },
];

/**
 * The groups on /about, in the order they are shown. `id` is the section's
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
  { id: "maps", title: "Map Regex", faqs: MAPS_FAQ },
  { id: "leveling", title: "Leveling Guide", faqs: LEVELING_FAQ },
];

/** The id a question wears on /about: zero based in, one based out. */
export function faqAnchor(group: string, index: number) {
  return `faq-${group}-${index + 1}`;
}
