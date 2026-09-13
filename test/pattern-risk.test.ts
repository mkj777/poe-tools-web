import assert from "node:assert/strict";
import test from "node:test";
import { patternRisks, type FragmentRisk } from "../src/lib/pattern-risk.ts";
import { matchesBestiaryPattern } from "../src/lib/bestiary-regex.ts";
import { BESTIARY_MOD_NAMES } from "../src/lib/bestiary-mods.ts";
import { MONSTER_MOD_NAMES } from "../src/lib/monster-mods.ts";
import { OBSERVED_MOD_LINES } from "../src/lib/observed-mods.ts";
import {
  MONSTER_NAME_PREFIXES,
  MONSTER_NAME_SUFFIXES,
  MONSTER_NAME_TITLES,
} from "../src/lib/monster-words.ts";

test("a fragment nothing in the pool can produce carries no risk", () => {
  assert.deepEqual(patternRisks("xyzxyzxyz-not-a-real-fragment"), []);
});

test("a fragment that only turns up in an ordinary monster mod is a modifier risk", () => {
  // "rar" is not inside any generated name, but it is inside "Temporarily
  // Revives", an everyday rare monster mod that could sit on any beast.
  const risks = patternRisks("rar");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].kind, "modifier");
  assert.equal(risks[0].fragment, "rar");
});

test("a fragment that occurs in a generated name is caught before it is checked against modifiers", () => {
  // Every generated name is prefix+suffix, so any substring spanning a whole
  // suffix, like "back" (Wild Brambleback, Farric Goliath's family etc.), is
  // caught as a name risk.
  const risks = patternRisks("back");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].kind, "generated name");
});

test("a fragment can only be caught straddling a name and its title", () => {
  // "der th" matches nothing as a bare prefix+suffix, only where a name ending
  // in "der" runs into " the <title>".
  const risks = patternRisks("der th");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].kind, "generated name");
  assert.match(risks[0].example, /the /);
});

test("an empty pattern has no fragments to check", () => {
  assert.deepEqual(patternRisks(""), []);
});

test("each fragment of a piped pattern is checked, and a repeat is not checked twice", () => {
  const once = patternRisks("rar");
  const twice = patternRisks("rar|rar");
  assert.deepEqual(twice, once);
});

test("an empty fragment between two pipes is skipped rather than flagged", () => {
  assert.deepEqual(patternRisks("|rar|"), patternRisks("rar"));
});

/**
 * The implementation this one replaced, kept as the oracle: one regex per
 * line, through the same public matcher the simulator's tiles use.
 */
function riskOfByLine(fragment: string): FragmentRisk | null {
  const names: string[] = [];
  for (const prefix of MONSTER_NAME_PREFIXES) {
    for (const suffix of MONSTER_NAME_SUFFIXES) names.push(prefix + suffix);
  }
  const name = names.find((n) => matchesBestiaryPattern(fragment, n));
  if (name) return { fragment, kind: "generated name", example: name };

  const titled = MONSTER_NAME_TITLES.find((title) =>
    names
      .slice(0, 500)
      .some((n) => matchesBestiaryPattern(fragment, `${n} the ${title}`)),
  );
  if (titled) {
    return { fragment, kind: "generated name", example: `… the ${titled}` };
  }

  const mods = [...BESTIARY_MOD_NAMES, ...MONSTER_MOD_NAMES, ...OBSERVED_MOD_LINES];
  const mod = mods.find((m) => matchesBestiaryPattern(fragment, m));
  if (mod) return { fragment, kind: "modifier", example: mod };
  return null;
}

/** Fragments of every shape a player types: plain, anchored, wildcarded,
    grouped, negated, accented, and one that does not compile. */
const FRAGMENTS = [
  "rar",
  "back",
  "der th",
  "xyzxyzxyz",
  "^goat",
  "ler$",
  "fire",
  "a.b",
  "[^x]ab",
  "(?!a)b",
  "the ",
  "man th",
  "ÉLAN",
  "^craicic(",
  "temporarily",
  "presence",
];

test("compiling the fragment once gives the same answer as compiling it per line", () => {
  for (const fragment of FRAGMENTS) {
    assert.deepEqual(
      patternRisks(fragment),
      [riskOfByLine(fragment)].filter((r) => r !== null),
      fragment,
    );
  }
});

test("one regex is built per fragment, not one per line", () => {
  const Original = globalThis.RegExp;
  let built = 0;
  // Every `new RegExp` inside the module reaches for the global, so counting
  // there needs no seam in the code under test.
  globalThis.RegExp = class extends Original {
    constructor(...args: ConstructorParameters<typeof RegExp>) {
      super(...args);
      built++;
    }
  } as typeof RegExp;
  try {
    // Warm the name list first: building it is not a regex either way.
    patternRisks("xyzxyzxyz");
    built = 0;
    patternRisks("rar|back|der th|xyzxyzxyz");
  } finally {
    globalThis.RegExp = Original;
  }
  assert.equal(built, 4);
});
