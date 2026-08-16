import { BESTIARY_MOD_NAMES } from "./bestiary-mods.ts";
import { MONSTER_MOD_NAMES } from "./monster-mods.ts";
import {
  MONSTER_NAME_PREFIXES,
  MONSTER_NAME_SUFFIXES,
  MONSTER_NAME_TITLES,
} from "./monster-words.ts";
import type { Beast } from "./ninja.ts";

/**
 * One captured beast, the way the Bestiary shows it.
 *
 * From the in-game tooltips: the header is the name the game spelled for that
 * capture — "Greyscreech", "Copperfrenzy", "Acridtalon the Drooling" — and the
 * type is only underneath it, in dashes. Then the level, then the Bestiary
 * modifiers in red, then the ordinary monster modifiers in white, by name and
 * nothing else.
 *
 *     Greyscreech
 *     - Farric Flame Hellion Alpha -
 *     Level: 83
 *     Farric Presence / Tiger Prey / Fertile Presence
 *     Soul Eater / Extra Fire Damage and Exposure
 *
 * None of that is in any price list, and it is what a pattern really has to
 * survive, so the simulation rolls it.
 */
export type Capture = {
  /** The generated name, which is all the grid shows. */
  name: string;
  type: string;
  level: number;
  /** Red in game, and only three on a red beast, one on a yellow. */
  bestiaryMods: string[];
  monsterMods: string[];
  /** Every line the search can read. */
  lines: string[];
};

/** Deterministic, so a roll can be reproduced and linked to. */
function seedFrom(text: string, salt: number) {
  let hash = 0x811c9dc5 ^ salt;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(random: () => number, from: T[]) =>
  from[Math.floor(random() * from.length)];

function sample<T>(random: () => number, from: T[], count: number) {
  const out: T[] = [];
  while (out.length < count && out.length < from.length) {
    const one = pick(random, from);
    if (!out.includes(one)) out.push(one);
  }
  return out;
}

/**
 * A beast lucky enough to survive the altar keeps this, so it shows up on the
 * tooltip as an extra line.
 */
const BLOOD_ALTAR =
  "10% chance not to be consumed when sacrificed at the Blood Altar";

export function rollCapture(beast: Beast, salt = 0): Capture {
  const random = mulberry32(seedFrom(beast.name, salt));

  // Titles come ready to attach: "the Unflinching" wants a space in front,
  // ", Child of God" wants nothing.
  const title = pick(random, MONSTER_NAME_TITLES);
  const base =
    pick(random, MONSTER_NAME_PREFIXES) + pick(random, MONSTER_NAME_SUFFIXES);
  // Roughly one in five carries a title.
  const name =
    random() < 0.2 ? base + (title.startsWith(",") ? title : ` ${title}`) : base;

  const bestiaryMods = sample(
    random,
    BESTIARY_MOD_NAMES,
    beast.rarity === "red" ? 3 : 1,
  );
  const monsterMods = sample(random, MONSTER_MOD_NAMES, 2 + Math.floor(random() * 3));
  if (random() < 0.15) monsterMods.push(BLOOD_ALTAR);

  const traits = (beast.baseType ?? "").split("|").filter(Boolean);

  return {
    name,
    type: beast.name,
    level: 83,
    bestiaryMods,
    monsterMods,
    lines: [
      name,
      beast.name,
      ...traits,
      `Level: 83`,
      ...bestiaryMods,
      ...monsterMods,
    ],
  };
}
