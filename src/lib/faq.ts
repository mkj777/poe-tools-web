import type { Faq } from "./seo.ts";

/**
 * The questions a page is actually asked, answered on the page itself.
 *
 * Two readers want this. A person who arrived from a search wants the answer
 * without going back, and a search engine that writes the answer itself wants a
 * short block it can lift whole. Both are served by the same thing: the
 * question as somebody would type it, and forty to sixty words under it that
 * settle it without a preamble.
 *
 * Nothing here is guessed. What the two search fields do comes from the in game
 * testing logged in `docs/bestiary-search.md` and `docs/stash-search.md`, which
 * is the one thing this site knows that no other page about it does.
 */

export const HOME_FAQ: readonly Faq[] = [
  {
    question: "What tools do you need for Path of Exile?",
    answer:
      "Four cover almost everything. Path of Building plans the build, a FilterBlade loot filter decides what you see on the ground, Awakened PoE Trade price checks an item from inside the game, and poe.ninja shows what other people are playing and what things sell for. The official trade site does the buying.",
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
];
