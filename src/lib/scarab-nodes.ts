import type { ExchangeItem } from "./ninja.ts";
import { SCARAB_TIERS, type ScarabTier } from "./scarab-tiers.ts";

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
 * Every name and every line below was read out of GGG's published Atlas tree
 * export at 3.29 and then checked a second time against the wiki, which agrees
 * on all twenty one. Nothing here is remembered or inferred. The lines are the
 * game's own words with the subject dropped, since the card above them has
 * already said whose maps and whose scarabs are meant:
 *
 *   "Your Maps have no chance to contain Abysses"
 *   "Scarabs dropped in your Maps have 100% increased chance to be Essence Scarabs"
 */
export type ScarabNode = {
  id: string;
  /** The passive, spelled the way the Atlas tree spells it. */
  notable: string;
  /** What it does about that family, for the line under the name. */
  effect: string;
  /** What the names of the family's scarabs begin with. */
  prefixes: readonly string[];
  /**
   * The content has no scarabs of its own, so nothing is at stake here. A real
   * zero, and not the same thing as a family the exchange failed to price.
   */
  scarabless?: boolean;
};

/**
 * The twelve that switch a mechanic off. Notables, strictly: not one carries
 * the keystone flag in the tree data, though everybody calls them keystones and
 * so does this page's title. A sweep of every node for "no chance to contain"
 * returns these twelve and nothing else.
 *
 * Eleven of them also say "Scarabs found in your Maps cannot be X Scarabs",
 * which is where each family below comes from. Three of those families are not
 * named after the mechanic, and the twelfth has no such line at all.
 */
export const EXCLUSIONS: readonly ScarabNode[] = [
  {
    id: "loved-by-the-sun",
    notable: "Loved by the Sun",
    effect: "No chance to contain Abysses.",
    prefixes: ["Abyss"],
  },
  {
    id: "fungal-remission",
    notable: "Fungal Remission",
    effect: "No chance to contain Blight Encounters.",
    prefixes: ["Blight"],
  },
  {
    id: "dimensional-barrier",
    notable: "Dimensional Barrier",
    effect: "No chance to contain Breaches.",
    prefixes: ["Breach"],
  },
  {
    id: "trade-embargo",
    notable: "Trade Embargo",
    effect: "No chance to contain Expedition Encounters.",
    prefixes: ["Expedition"],
  },
  {
    id: "sealed-domain",
    notable: "Sealed Domain",
    effect: "No chance to contain Legion Encounters.",
    prefixes: ["Legion"],
  },
  {
    id: "civil-war-in-trarthus",
    notable: "Civil War in Trarthus",
    effect: "No chance to contain Mercenaries.",
    // Named after Trarthus, not after the mercenaries it removes. New in 3.29,
    // which is why every list of these written before it counts eleven.
    prefixes: ["Trarthan"],
  },
  {
    id: "ominous-silence",
    notable: "Ominous Silence",
    effect: "No chance to contain Mirrors of Delirium.",
    prefixes: ["Delirium"],
  },
  {
    id: "miners-strike",
    notable: "Miner's Strike",
    effect: "No chance to contain Ore Deposits.",
    // The Kalguur dig for them, and the scarabs are named after the Kalguur.
    prefixes: ["Kalguuran"],
  },
  {
    id: "secular-focus",
    notable: "Secular Focus",
    effect: "No chance to contain Ritual Altars.",
    prefixes: ["Ritual"],
  },
  {
    id: "black-thumb",
    notable: "Black Thumb",
    effect: "No chance to contain the Sacred Grove.",
    // The grove is Harvest, and the scarabs kept the league's name.
    prefixes: ["Harvest"],
  },
  {
    id: "straight-and-narrow",
    notable: "Straight and Narrow",
    effect: "No chance to contain Smuggler's Caches.",
    prefixes: [],
    scarabless: true,
  },
  {
    id: "servant-of-order",
    notable: "Servant of Order",
    effect: "No chance to contain Ultimatum Encounters.",
    prefixes: ["Ultimatum"],
  },
];

/**
 * The nine Carapaces, which raise how often one family drops rather than
 * removing it. Read the other way round from the exclusions: here the dearer
 * the family, the more the node is worth spending points on.
 *
 * Not one of the nine is named after the family it finds, and the node icons
 * belong to other leagues entirely, so every family below comes from the stat
 * text of the node rather than from its name or its picture.
 *
 * Exactly nine: a sweep for "Carapace" across the tree returns these and no
 * tenth. Fifteen further notables bias a family too, but at 16 to 40 percent
 * and bundled with a spawn chance line. These nine are the set at 100 that
 * does nothing else.
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

/**
 * How often one tier is seen against another.
 *
 * GGG publishes the five tiers and says they are what decides a scarab's drop
 * rate. It publishes no numbers for them: not in a patch note, not in the item
 * data, not anywhere the wiki or poedb could find. These five are the medians
 * of the only measurement there is, thirty three thousand vendor recipes a
 * player collected at 3.27 and the wiki links to from its Scarab article, a
 * recipe being a roll on the same weights a drop is.
 *
 *   https://www.poewiki.net/wiki/Scarab
 *   Spreadsheet by Lextra, adapted from a reddit post by /u/VTSAX_
 *
 * The tiers sit tight around their medians: 479 to 674 over twenty six commons,
 * 365 to 439 over twenty one uncommons. Extreme is three scarabs and lands on
 * top of mythic, so this sample does not really tell those two apart. It is a
 * league old and it is not GGG's, which is why the page says as much rather
 * than quoting it as a drop rate.
 */
const TIER_WEIGHT: Readonly<Record<ScarabTier, number>> = {
  common: 616,
  uncommon: 414,
  rare: 210,
  mythic: 24,
  extreme: 22,
};

/** How often a scarab drops against its siblings, nought for one we cannot say. */
const weightOf = (name: string) => {
  const tier = SCARAB_TIERS[name];
  return tier ? TIER_WEIGHT[tier] : 0;
};

/** One scarab of a family, under the name the game gives it in full. */
export type PricedScarab = ExchangeItem & {
  /** Absent for a scarab the tier table has not been regenerated for. */
  tier?: ScarabTier;
  /**
   * How much of the family's drops are this one scarab, nought to one.
   *
   * The row draws it as a bar behind itself, which is the whole argument of
   * the page in one glance: the dearest scarab of a family is usually the
   * thinnest bar in it.
   */
  share: number;
};

export type PricedNode = ScarabNode & {
  scarabs: PricedScarab[];
  /** One of every scarab of the family. */
  total: number;
  /** The same pool per scarab, for comparing families of different sizes. */
  average: number;
  /** The dearest single scarab, which is the one anybody sets out to farm. */
  top: number;
  /**
   * Chaos the next scarab of this family is worth, each one counting for as
   * often as its tier says it drops.
   *
   * The other three count a scarab nobody ever sees for as much as one that
   * drops every other map, which is how a family holding a single dear and
   * rare scarab comes to look like the one to farm. Ultimatum holds the most
   * expensive scarab in the game and is worth about seven chaos a drop.
   */
  expected: number;
};

/**
 * What one scarab of a family is worth, over the family's own drop weights.
 *
 * A scarab no tier is known for weighs nothing and so says nothing, rather than
 * being counted as common and dragging the answer to a price nobody sees. When
 * no scarab of the family has a tier there is nothing to weight with, and the
 * flat mean stands in, which is what the Average button says anyway.
 */
function expectedValue(scarabs: readonly PricedScarab[]) {
  let weight = 0;
  let chaos = 0;
  for (const s of scarabs) {
    const w = weightOf(s.name);
    weight += w;
    chaos += w * s.chaosValue;
  }
  if (weight > 0) return chaos / weight;
  const flat = scarabs.reduce((sum, s) => sum + s.chaosValue, 0);
  return scarabs.length ? flat / scarabs.length : 0;
}

/** Whether a scarab belongs to a family, by the name the game gave it. */
function belongsTo(name: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => name.startsWith(`${prefix} `));
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
    const found = scarabs.filter((s) => belongsTo(s.name, node.prefixes));
    if (found.length === 0 && !node.scarabless) return [];

    const pool = found.reduce((sum, s) => sum + weightOf(s.name), 0);
    const mine: PricedScarab[] = found.map((s) => ({
      ...s,
      tier: SCARAB_TIERS[s.name],
      share: pool > 0 ? weightOf(s.name) / pool : 0,
    }));

    mine.sort((a, b) => b.chaosValue - a.chaosValue);
    const total = mine.reduce((sum, s) => sum + s.chaosValue, 0);

    return [
      {
        ...node,
        scarabs: mine,
        total,
        average: mine.length ? total / mine.length : 0,
        top: mine[0]?.chaosValue ?? 0,
        expected: expectedValue(mine),
      },
    ];
  });
}
