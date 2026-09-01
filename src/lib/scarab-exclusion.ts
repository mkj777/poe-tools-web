import type { ExchangeItem } from "./ninja.ts";

/**
 * The twelve Atlas passives that take a mechanic out of your maps, and what
 * taking it out costs you in scarabs.
 *
 * Each one removes a content type entirely and stops that content's scarabs
 * dropping in your maps, so the price of the family is the price of the
 * passive. This file is the mapping from one to the other and nothing else:
 * the prices come from the currency exchange at read time.
 *
 * A family is matched on the first word of its scarabs, which is how the game
 * names them. Four of the twelve are not named after the mechanic they belong
 * to, and one has no scarabs at all, which is why this is a table rather than
 * a string comparison.
 *
 * Names and stat lines were read out of GGG's own Atlas tree data and the
 * trade site's static item list at 3.29.3, not out of a wiki.
 */
export type Keystone = {
  id: string;
  /** The passive, spelled the way the Atlas tree spells it. */
  keystone: string;
  /** The content it takes out of your maps, in the tree's own words. */
  disables: string;
  /** What the names of that content's scarabs begin with. */
  prefixes: readonly string[];
  /**
   * The content has no scarabs of its own, so nothing is given up here. A real
   * zero, and not the same thing as a family the exchange failed to price.
   */
  scarabless?: boolean;
  /** Anything this one does that the other eleven do not. */
  note?: string;
};

/**
 * What all twelve hand back, word for word, so the cards do not each repeat it.
 *
 * They really are identical. poedb still shows +5% on two of them and drops the
 * line from two others; the tree data GGG serves says +2% on all twelve.
 */
export const SHARED_GRANT =
  "Your Maps have +2% chance to contain other Extra Content that can be turned off through Atlas Passives";

/**
 * Notables, strictly. Not one of the twelve carries the keystone flag in the
 * tree data, though everybody calls them keystones and so does this page's
 * heading.
 */
export const KEYSTONES: readonly Keystone[] = [
  {
    id: "loved-by-the-sun",
    keystone: "Loved by the Sun",
    disables: "Abysses",
    // The 3.29 notes rename one of these to "Abyssal Scarab of the Consort"
    // while the live item list still says "Abyss". Both prefixes are claimed,
    // because whichever is right, the family should not quietly go missing.
    prefixes: ["Abyss", "Abyssal"],
  },
  {
    id: "fungal-remission",
    keystone: "Fungal Remission",
    disables: "Blight Encounters",
    prefixes: ["Blight"],
  },
  {
    id: "dimensional-barrier",
    keystone: "Dimensional Barrier",
    disables: "Breaches",
    prefixes: ["Breach"],
  },
  {
    id: "trade-embargo",
    keystone: "Trade Embargo",
    disables: "Expedition Encounters",
    prefixes: ["Expedition"],
  },
  {
    id: "sealed-domain",
    keystone: "Sealed Domain",
    disables: "Legion Encounters",
    prefixes: ["Legion"],
  },
  {
    id: "civil-war-in-trarthus",
    keystone: "Civil War in Trarthus",
    disables: "Mercenaries",
    // Named after Trarthus, not after the mercenaries it removes. New in 3.29,
    // which is why every list of these written before it counts eleven.
    prefixes: ["Trarthan"],
  },
  {
    id: "ominous-silence",
    keystone: "Ominous Silence",
    disables: "Mirrors of Delirium",
    prefixes: ["Delirium"],
  },
  {
    id: "miners-strike",
    keystone: "Miner's Strike",
    disables: "Ore Deposits",
    // The Kalguur dig for them, and the scarabs are named after the Kalguur.
    prefixes: ["Kalguuran"],
  },
  {
    id: "secular-focus",
    keystone: "Secular Focus",
    disables: "Ritual Altars",
    prefixes: ["Ritual"],
  },
  {
    id: "black-thumb",
    keystone: "Black Thumb",
    disables: "the Sacred Grove",
    // The grove is Harvest, and the scarabs kept the league's name.
    prefixes: ["Harvest"],
  },
  {
    id: "straight-and-narrow",
    keystone: "Straight and Narrow",
    disables: "Smuggler's Caches",
    prefixes: [],
    scarabless: true,
    note: "Rogue's Markers, Contracts and Blueprints stop dropping in your maps as well.",
  },
  {
    id: "servant-of-order",
    keystone: "Servant of Order",
    disables: "Ultimatum Encounters",
    prefixes: ["Ultimatum"],
  },
];

/** One scarab, with the part of its name that tells it from its siblings. */
export type PricedScarab = ExchangeItem & { short: string };

export type MechanicPrices = Keystone & {
  scarabs: PricedScarab[];
  /** One of every scarab of the family. */
  total: number;
  /** The same pool per scarab, for comparing families of different sizes. */
  average: number;
  /** The dearest single scarab, which is the one anybody sets out to farm. */
  top: number;
};

/**
 * What is left of a scarab's name once the family has been said above it.
 *
 * "Ambush Scarab of Potency" reads as "of Potency" under a heading that already
 * says Ambush, and the plain one is left as "Scarab". The suffix is the part
 * that tells one from another, and it is also the part an ellipsis would eat.
 */
function shorten(name: string, prefix: string) {
  const rest = name
    .slice(prefix.length)
    .replace(/^\s*Scarab\s*/, "")
    .trim();
  return rest || "Scarab";
}

/** Whether a scarab belongs to a family, by the name the game gave it. */
function belongsTo(name: string, prefixes: readonly string[]) {
  return prefixes.find((prefix) => name.startsWith(`${prefix} `));
}

/**
 * The twelve with their scarabs and what those scarabs cost.
 *
 * A passive whose family the exchange has no price for at all is dropped: shown
 * at zero it would read as the cheapest content to give up, which is the one
 * wrong answer this page could give. Straight and Narrow is the exception and
 * says so in the data, because Smuggler's Caches genuinely have no scarabs, and
 * that zero is the answer rather than a hole in it.
 */
export function priceMechanics(
  scarabs: readonly ExchangeItem[],
  keystones: readonly Keystone[] = KEYSTONES,
): MechanicPrices[] {
  return keystones.flatMap((keystone) => {
    const mine: PricedScarab[] = [];
    for (const scarab of scarabs) {
      const prefix = belongsTo(scarab.name, keystone.prefixes);
      if (prefix) mine.push({ ...scarab, short: shorten(scarab.name, prefix) });
    }
    if (mine.length === 0 && !keystone.scarabless) return [];

    mine.sort((a, b) => b.chaosValue - a.chaosValue);
    const total = mine.reduce((sum, s) => sum + s.chaosValue, 0);

    return [
      {
        ...keystone,
        scarabs: mine,
        total,
        average: mine.length ? total / mine.length : 0,
        top: mine[0]?.chaosValue ?? 0,
      },
    ];
  });
}

/**
 * The scarabs no passive can take away from you: the sixteen families whose
 * content cannot be switched off, plus the handful that carry no family name at
 * all. They roll on any map, so they are not part of the comparison.
 */
export function unclaimedScarabs(
  scarabs: readonly ExchangeItem[],
  keystones: readonly Keystone[] = KEYSTONES,
) {
  const prefixes = keystones.flatMap((k) => k.prefixes);
  return scarabs.filter((s) => !belongsTo(s.name, prefixes));
}
