import type { ExchangeItem } from "./ninja.ts";

/**
 * The Atlas passives that have something to do with one family of scarabs, and
 * what that family is worth.
 *
 * There are two kinds and they are read the same way. One kind takes a mechanic
 * out of your maps and its scarabs with it, so the price of the family is what
 * the passive costs you. The other raises how often a family drops, so the
 * price of the family is what the passive is worth taking for. Either way the
 * question is the same: what is this family selling for.
 *
 * A family is matched on the first word of its scarabs, which is how the game
 * names them. Several passives are not named after the family they touch, and
 * one mechanic has no scarabs at all, which is why this is a table rather than
 * a string comparison.
 *
 * Names and stat lines were read out of GGG's own Atlas tree data and the trade
 * site's static item list at 3.29.3, not out of a wiki.
 */
export type ScarabNode = {
  id: string;
  /** The passive, spelled the way the Atlas tree spells it. */
  notable: string;
  /** What it does about that family, for the line under the name. */
  effect: string;
  /** What the names of the family's scarabs begin with. */
  prefixes: readonly string[];
  /** Anything this one does that the ones beside it do not. */
  note?: string;
  /**
   * The content has no scarabs of its own, so nothing is at stake here. A real
   * zero, and not the same thing as a family the exchange failed to price.
   */
  scarabless?: boolean;
};

/**
 * What all twelve exclusions hand back, word for word, so the cards do not each
 * repeat it.
 *
 * They really are identical. poedb still shows +5% on two of them and drops the
 * line from two others; the tree data GGG serves says +2% on all twelve.
 */
export const SHARED_GRANT =
  "Your Maps have +2% chance to contain other Extra Content that can be turned off through Atlas Passives";

/**
 * The twelve that switch a mechanic off. Notables, strictly: not one of them
 * carries the keystone flag in the tree data, though everybody calls them
 * keystones and so does this page's title.
 */
export const EXCLUSIONS: readonly ScarabNode[] = [
  {
    id: "loved-by-the-sun",
    notable: "Loved by the Sun",
    effect: "Disables Abysses.",
    // The 3.29 notes rename one of these to "Abyssal Scarab of the Consort"
    // while the live item list still says "Abyss". Both prefixes are claimed,
    // because whichever is right, the family should not quietly go missing.
    prefixes: ["Abyss", "Abyssal"],
  },
  {
    id: "fungal-remission",
    notable: "Fungal Remission",
    effect: "Disables Blight Encounters.",
    prefixes: ["Blight"],
  },
  {
    id: "dimensional-barrier",
    notable: "Dimensional Barrier",
    effect: "Disables Breaches.",
    prefixes: ["Breach"],
  },
  {
    id: "trade-embargo",
    notable: "Trade Embargo",
    effect: "Disables Expedition Encounters.",
    prefixes: ["Expedition"],
  },
  {
    id: "sealed-domain",
    notable: "Sealed Domain",
    effect: "Disables Legion Encounters.",
    prefixes: ["Legion"],
  },
  {
    id: "civil-war-in-trarthus",
    notable: "Civil War in Trarthus",
    effect: "Disables Mercenaries.",
    // Named after Trarthus, not after the mercenaries it removes. New in 3.29,
    // which is why every list of these written before it counts eleven.
    prefixes: ["Trarthan"],
  },
  {
    id: "ominous-silence",
    notable: "Ominous Silence",
    effect: "Disables Mirrors of Delirium.",
    prefixes: ["Delirium"],
  },
  {
    id: "miners-strike",
    notable: "Miner's Strike",
    effect: "Disables Ore Deposits.",
    // The Kalguur dig for them, and the scarabs are named after the Kalguur.
    prefixes: ["Kalguuran"],
  },
  {
    id: "secular-focus",
    notable: "Secular Focus",
    effect: "Disables Ritual Altars.",
    prefixes: ["Ritual"],
  },
  {
    id: "black-thumb",
    notable: "Black Thumb",
    effect: "Disables the Sacred Grove.",
    // The grove is Harvest, and the scarabs kept the league's name.
    prefixes: ["Harvest"],
  },
  {
    id: "straight-and-narrow",
    notable: "Straight and Narrow",
    effect: "Disables Smuggler's Caches.",
    prefixes: [],
    scarabless: true,
    note: "Rogue's Markers, Contracts and Blueprints stop dropping in your maps as well.",
  },
  {
    id: "servant-of-order",
    notable: "Servant of Order",
    effect: "Disables Ultimatum Encounters.",
    prefixes: ["Ultimatum"],
  },
];

/**
 * The nine Carapaces, which raise how often one family drops rather than
 * removing it. Read the other way round from the exclusions: here the dearer
 * the family, the more the node is worth spending points on.
 *
 * Not one of the nine is named after the family it finds, and the node icons
 * are of other leagues entirely, so every line below comes from the stat text
 * of the node itself rather than from its name or its picture.
 *
 * Fifteen further notables bias a family too, at 16 to 40 percent and bundled
 * with a spawn chance line, and they are deliberately not here: these nine are
 * the set that does nothing else.
 */
export const BOOSTS: readonly ScarabNode[] = [
  {
    id: "crystalline-carapaces",
    notable: "Crystalline Carapaces",
    effect: "100% increased chance to be Essence Scarabs.",
    prefixes: ["Essence"],
  },
  {
    id: "devoted-carapaces",
    notable: "Devoted Carapaces",
    effect: "100% increased chance to be Domination Scarabs.",
    // Domination is the shrines. Nothing in the name says so.
    prefixes: ["Domination"],
  },
  {
    id: "explorative-carapaces",
    notable: "Explorative Carapaces",
    effect: "100% increased chance to be Cartography Scarabs.",
    prefixes: ["Cartography"],
  },
  {
    id: "harrowing-carapaces",
    notable: "Harrowing Carapaces",
    effect: "100% increased chance to be Divination Scarabs.",
    prefixes: ["Divination"],
  },
  {
    id: "outcasted-carapaces",
    notable: "Outcasted Carapaces",
    effect: "100% increased chance to be Anarchy Scarabs.",
    // The rogue exiles. "Outcasted" is the game's spelling, not a typo here.
    prefixes: ["Anarchy"],
  },
  {
    id: "possessed-carapaces",
    notable: "Possessed Carapaces",
    effect: "100% increased chance to be Torment Scarabs.",
    prefixes: ["Torment"],
  },
  {
    id: "tainted-carapaces",
    notable: "Tainted Carapaces",
    effect: "100% increased chance to be Beyond Scarabs.",
    prefixes: ["Beyond"],
  },
  {
    id: "towering-carapaces",
    notable: "Towering Carapaces",
    effect: "100% increased chance to be Titanic Scarabs.",
    prefixes: ["Titanic"],
  },
  {
    id: "trapping-carapaces",
    notable: "Trapping Carapaces",
    effect: "100% increased chance to be Ambush Scarabs.",
    // Ambush is the strongboxes. This is also the one of the nine whose stat
    // line says "found in your Maps" where the other eight say "dropped in",
    // which is in the game data and not a slip here.
    prefixes: ["Ambush"],
  },
];

/** One scarab, with the part of its name that tells it from its siblings. */
export type PricedScarab = ExchangeItem & { short: string };

export type PricedNode = ScarabNode & {
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
 * A set of passives with their scarabs and what those scarabs cost.
 *
 * A passive whose family the exchange has no price for at all is dropped: shown
 * at zero it would read as the cheapest content to give up, or as a node not
 * worth taking, which are the two wrong answers this page could give. Straight
 * and Narrow is the exception and says so in the data, because Smuggler's
 * Caches genuinely have no scarabs, and that zero is an answer rather than a
 * hole in one.
 */
export function priceNodes(
  scarabs: readonly ExchangeItem[],
  nodes: readonly ScarabNode[],
): PricedNode[] {
  return nodes.flatMap((node) => {
    const mine: PricedScarab[] = [];
    for (const scarab of scarabs) {
      const prefix = belongsTo(scarab.name, node.prefixes);
      if (prefix) mine.push({ ...scarab, short: shorten(scarab.name, prefix) });
    }
    if (mine.length === 0 && !node.scarabless) return [];

    mine.sort((a, b) => b.chaosValue - a.chaosValue);
    const total = mine.reduce((sum, s) => sum + s.chaosValue, 0);

    return [
      {
        ...node,
        scarabs: mine,
        total,
        average: mine.length ? total / mine.length : 0,
        top: mine[0]?.chaosValue ?? 0,
      },
    ];
  });
}

/**
 * The scarabs no exclusion can take away from you: the families whose content
 * cannot be switched off, plus the handful that carry no family name at all.
 * They roll on any map, so they are not part of that comparison.
 */
export function unclaimedScarabs(
  scarabs: readonly ExchangeItem[],
  nodes: readonly ScarabNode[] = EXCLUSIONS,
) {
  const prefixes = nodes.flatMap((n) => n.prefixes);
  return scarabs.filter((s) => !belongsTo(s.name, prefixes));
}
