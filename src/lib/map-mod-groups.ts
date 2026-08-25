// Explicit extension: Node's test runner resolves this file directly.
import { MAP_MOD_LINES } from "./map-mods.ts";

/**
 * A ban a player would actually ask for.
 *
 * A map affix is the wrong unit to offer. `Abhorrent` bundles quantity, rarity,
 * pack size and "Area is inhabited by Abominations", of which only the last is
 * worth banning. So a group owns the display lines, not the affix.
 *
 * And it owns nothing else. A group has no name of its own: what names it is
 * the wording the game prints on the map, which is also what you are reading
 * when you decide whether to run one. A friendlier paraphrase would be a second
 * vocabulary to learn, and would not match anything you could search for.
 *
 * These groups deliberately do not cover all 177 lines. Naming every one of
 * them would be a lot of naming for lines nobody bans, and it would mean a new
 * league's modifiers are unusable until someone curates them. Whatever no group
 * claims stays individually bannable through `looseLines()`.
 */
export type ModGroup = {
  id: string;
  lines: readonly string[];
};

/**
 * What every map is rolled for. Never a target: banning these would hide the
 * maps worth keeping. They still matter, because every map carries them, so a
 * fragment landing in one of them dims everything.
 */
export const REWARD_LINES: readonly string[] = [
  "#% increased Pack size",
  "#% increased Quantity of Items found in this Area",
  "#% increased Rarity of Items found in this Area",
  "#% more Currency found in Area",
  "#% more Maps found in Area",
  "#% more Scarabs found in Area",
  "This Area's Modifiers to Quantity of Items found also apply to Rarity",
];

export const MOD_GROUPS: readonly ModGroup[] = [
  {
    id: "reflect",
    lines: [
      "Rare Monsters have Elemental Thorns reflecting # Elemental Damage",
      "Rare Monsters have Physical Thorns reflecting # Physical Damage",
    ],
  },
  {
    id: "impale-reflect",
    // Three lines because the game wraps this one modifier across three.
    lines: [
      "When a fifth Impale is inflicted on a Player,",
      "Impales are removed to Reflect their Physical Damage multiplied",
      "by their remaining Hits to that Player and their Allies within # metres",
    ],
  },
  {
    id: "no-regen",
    lines: [
      "Players cannot Recharge Energy Shield",
      "Players cannot Regenerate Life, Mana or Energy Shield",
      "Players have no Life or Mana Regeneration",
    ],
  },
  {
    id: "no-leech",
    lines: [
      "Monsters cannot be Leeched from",
      "Players have #% reduced Maximum total Life, Mana and Energy Shield Recovery per second from Leech",
    ],
  },
  {
    id: "less-recovery",
    lines: ["Players have #% less Recovery Rate of Life and Energy Shield"],
  },
  {
    id: "temporal-chains",
    lines: ["Players are Cursed with Temporal Chains"],
  },
  {
    id: "vulnerability",
    lines: ["Players are Cursed with Vulnerability"],
  },
  {
    id: "elemental-weakness",
    lines: ["Players are Cursed with Elemental Weakness"],
  },
  {
    id: "enfeeble",
    lines: ["Players are Cursed with Enfeeble"],
  },
  {
    id: "punishment",
    lines: ["Players are Cursed with Punishment"],
  },
  {
    id: "curse-resistant",
    lines: [
      "#% less effect of Curses on Monsters",
      "#% reduced Effect of Curses on Monsters",
      "Monsters are Hexproof",
    ],
  },
  {
    id: "avoid-ailments",
    lines: [
      "Monsters have #% chance to Avoid Elemental Ailments",
      "Monsters have a #% chance to avoid Poison, Impale, and Bleeding",
    ],
  },
  {
    id: "max-resistances",
    lines: ["Players have #% to all maximum Resistances"],
  },
  {
    id: "penetration",
    lines: ["Monster Damage Penetrates #% Elemental Resistances"],
  },
  {
    id: "monster-resistances",
    lines: [
      "#% Monster Chaos Resistance",
      "#% Monster Cold Resistance",
      "#% Monster Elemental Resistances",
      "#% Monster Fire Resistance",
      "#% Monster Lightning Resistance",
      "#% Monster Physical Damage Reduction",
    ],
  },
  {
    id: "crit-resistant",
    lines: ["Monsters take #% reduced Extra Damage from Critical Strikes"],
  },
  {
    id: "monster-crit",
    lines: [
      "#% to Monster Critical Strike Multiplier",
      "Monsters have #% increased Critical Strike Chance",
    ],
  },
  {
    id: "extra-damage",
    lines: [
      "Monsters deal #% extra Physical Damage as Cold",
      "Monsters deal #% extra Physical Damage as Fire",
      "Monsters deal #% extra Physical Damage as Lightning",
      "Monsters gain #% of their Physical Damage as Extra Chaos Damage",
      "Monsters gain #% of their Physical Damage as Extra Damage of a random Element",
    ],
  },
  {
    id: "monster-ailments",
    lines: [
      "All Monster Damage can Ignite, Freeze and Shock",
      "All Monster Damage from Hits always Ignites",
      "Monsters Ignite, Freeze and Shock on Hit",
      "Monsters have a #% chance to Ignite, Freeze and Shock on Hit",
    ],
  },
  {
    id: "no-block-suppress",
    lines: [
      "Players cannot Block",
      "Players cannot Suppress Spell Damage",
      "Players have #% reduced Chance to Block",
      "Players have #% to amount of Suppressed Spell Damage Prevented",
    ],
  },
  {
    id: "no-charges",
    lines: [
      "Players cannot gain Endurance Charges",
      "Players cannot gain Frenzy Charges",
      "Players cannot gain Power Charges",
    ],
  },
  {
    id: "less-defences",
    lines: ["Players have #% less Armour", "Players have #% less Defences"],
  },
  {
    id: "less-accuracy",
    lines: ["Players have #% less Accuracy Rating"],
  },
  {
    id: "less-aura-effect",
    lines: ["Players have #% reduced effect of Non-Curse Auras from Skills"],
  },
  {
    id: "steal-charges",
    lines: ["Monsters steal Power, Frenzy and Endurance charges on Hit"],
  },
  {
    id: "flasks",
    lines: [
      "Players are targeted by a Meteor when they use a Flask",
      "Players gain #% reduced Flask Charges",
      "Players have #% less effect of Flasks applied to them",
    ],
  },
  {
    id: "minions",
    lines: [
      "Players' Minions have #% less Attack Speed",
      "Players' Minions have #% less Cast Speed",
      "Players' Minions have #% less Movement Speed",
    ],
  },
  {
    id: "totems-traps-mines",
    lines: [
      "#% of Damage Players' Totems take from Hits is taken from their Summoner's Life instead",
      "Player Skills which Throw Mines throw # fewer Mine",
      "Player Skills which Throw Traps throw # fewer Trap",
      "Players have # to maximum number of Summoned Totems",
    ],
  },
  {
    id: "monster-speed",
    lines: [
      "#% increased Monster Attack Speed",
      "#% increased Monster Cast Speed",
      "#% increased Monster Movement Speed",
    ],
  },
  {
    id: "monster-damage",
    lines: ["#% increased Monster Damage", "#% more Monster Life"],
  },
  {
    id: "extra-rare-mods",
    lines: ["Rare Monsters each have # additional Modifier"],
  },
  {
    id: "ground-effects",
    lines: [
      "Area has patches of Awakeners' Desolation",
      "Area has patches of Burning Ground",
      "Area has patches of Chilled Ground",
      "Area has patches of Consecrated Ground",
      "Area has patches of Shocked Ground",
      "Area has patches of Shocked Ground which increase Damage taken by #%",
      "Area has patches of desecrated ground",
      "Area contains patches of moving Marked Ground, inflicting random Marks",
    ],
  },
];

/**
 * The short list. Everything else is one expand away, so this only has to hold
 * what a player reaches for before thinking about their build.
 */
export const COMMON_GROUP_IDS: readonly string[] = [
  "reflect",
  "no-regen",
  "no-leech",
  "temporal-chains",
  "vulnerability",
  "elemental-weakness",
  "curse-resistant",
  "avoid-ailments",
  "max-resistances",
  "monster-crit",
];

/**
 * A preset is a build's answer to "which of these actually kill me". It ticks
 * groups and leaves them adjustable, so it is a starting point rather than a
 * mode.
 */
export const PRESETS: readonly {
  id: string;
  label: string;
  groups: readonly string[];
}[] = [
  {
    id: "squishy",
    label: "Squishy",
    groups: [
      "max-resistances",
      "penetration",
      "monster-crit",
      "extra-damage",
      "less-defences",
    ],
  },
  {
    id: "flicker-strike",
    label: "Flicker Strike",
    /**
     * Flicker lives on frenzy charges, leech and accuracy, and it stands still
     * inside the pack while it does, so it dies to crit and to curses that a
     * ranged build would shrug off. What it cannot do is the other half: a map
     * that resists crit or blunts its damage stops the loop before the leech
     * ever lands.
     */
    groups: [
      "no-leech",
      "less-recovery",
      "no-regen",
      "less-accuracy",
      "less-aura-effect",
      "steal-charges",
      "monster-crit",
      "crit-resistant",
      "max-resistances",
      "elemental-weakness",
      "vulnerability",
    ],
  },
];

const CLAIMED = new Set([
  ...MOD_GROUPS.flatMap((group) => [...group.lines]),
  ...REWARD_LINES,
]);

/**
 * Every modifier no group speaks for. Offered one by one and labelled with its
 * own text, so nothing is ever unreachable and a new league's modifiers work on
 * the day they land.
 */
export const looseLines = () => MAP_MOD_LINES.filter((l) => !CLAIMED.has(l));

/**
 * A player looking for a modifier types what they remember of the wording, and
 * the wording is all there is: searching "reflect" finds the Thorns lines
 * because the game writes "reflecting" in them.
 *
 * The `#` standing in for a rolled number is treated as whitespace rather than
 * as a character, so "increased Monster Damage" reaches a line that reads
 * "#% increased Monster Damage".
 */
export const matchesQuery = (
  entry: { lines: readonly string[] },
  query: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;

  const haystacks = entry.lines.map((text) =>
    text.replace(/#/g, " ").replace(/\s+/g, " ").trim().toLowerCase(),
  );

  return haystacks.some((text) => text.includes(needle));
};

/** The game's own wording, with the number it rolls shown as a placeholder. */
export const displayLine = (line: string) => line.replace(/#/g, "x");
