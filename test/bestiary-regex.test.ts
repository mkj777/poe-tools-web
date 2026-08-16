import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBestiaryRegex,
  matchesBestiaryPattern,
  MAX_PATTERN_LENGTH,
} from "../src/lib/bestiary-regex.ts";
import { BESTIARY_MOD_TEXT } from "../src/lib/bestiary-mods.ts";
import {
  MONSTER_NAME_PREFIXES,
  MONSTER_NAME_SUFFIXES,
  MONSTER_NAME_TITLES,
} from "../src/lib/monster-words.ts";

type Fixture = { name: string; chaosValue: number; baseType?: string };

/** A real Allflame beast overview from poe.ninja — 218 lines. */
const BEASTS: Fixture[] = JSON.parse(
  readFileSync(new URL("./beasts.fixture.json", import.meta.url), "utf8"),
);

const THRESHOLDS = [1, 2, 3, 5, 10, 20, 30, 100, 175];

/** What the Bestiary row shows: name, genus, family, habitat. */
const entry = (b: Fixture) => ({
  name: b.name,
  lines: (b.baseType ?? "").split("|").filter(Boolean),
});

const rowOf = (e: ReturnType<typeof entry>) => [e.name, ...e.lines];

function split(threshold: number) {
  return {
    wanted: BEASTS.filter((b) => b.chaosValue >= threshold).map(entry),
    unwanted: BEASTS.filter((b) => b.chaosValue < threshold).map(entry),
  };
}

test("empty input produces no pattern", () => {
  const { pattern, overmatched } = buildBestiaryRegex([], [{ name: "Parasite" }]);
  assert.equal(pattern, null);
  assert.deepEqual(overmatched, []);
});

test("isolates a beast from similarly named ones", () => {
  const { pattern, overmatched } = buildBestiaryRegex(
    [{ name: "Craicic Croaker" }],
    ["Craicic Chimeral", "Craicic Savage Crab", "Gravel Eater"].map((name) => ({ name })),
  );
  assert.ok(matchesBestiaryPattern(pattern!, "Craicic Croaker"));
  assert.ok(!matchesBestiaryPattern(pattern!, "Craicic Chimeral"));
  assert.deepEqual(overmatched, []);
});

test("anchoring isolates a name that ends other names", () => {
  // No substring of "Parasite" can avoid "Plated Parasite", but "^parasite"
  // can: the other lines do not start with it.
  const { pattern, overmatched } = buildBestiaryRegex(
    [{ name: "Parasite" }],
    [{ name: "Plated Parasite" }, { name: "Vicious Parasite" }],
  );
  assert.ok(pattern, "expected a pattern");
  assert.ok(pattern.startsWith("^"), `expected an anchor, got ${pattern}`);
  assert.ok(matchesBestiaryPattern(pattern, "Parasite"));
  assert.deepEqual(overmatched, []);
});

test("reports beasts no fragment can exclude", () => {
  // A name that *begins* another one cannot be isolated even with an anchor.
  const { pattern, overmatched } = buildBestiaryRegex(
    [{ name: "Craicic Maw" }],
    [{ name: "Craicic Mawbeast" }],
  );
  assert.ok(matchesBestiaryPattern(pattern!, "Craicic Maw"));
  assert.deepEqual(overmatched, ["Craicic Mawbeast"]);
});

test("matches substrings, not subsequences", () => {
  // Searching "wldbrstl" in game returned nothing at all, not even "Wild
  // Bristle Matron", so the field does not skip characters.
  const { pattern } = buildBestiaryRegex(
    [{ name: "Wild Bristle Matron" }],
    [{ name: "Craicic Croaker" }],
  );
  assert.ok(matchesBestiaryPattern(pattern!, "Wild Bristle Matron"));
  assert.ok(!matchesBestiaryPattern("wldbrstl", "Wild Bristle Matron"));
});

test("never builds on text a modifier also carries", () => {
  // Every beast can roll up to three modifiers and the search reads them, so
  // "far" pulls in anything with "Farric Presence" whatever its type.
  for (const threshold of [4, 20, 150]) {
    const { wanted, unwanted } = split(threshold);
    const { pattern } = buildBestiaryRegex(wanted, unwanted);
    assert.ok(pattern, `no pattern at ${threshold}c`);

    for (const mod of BESTIARY_MOD_TEXT) {
      assert.ok(
        !matchesBestiaryPattern(pattern, mod),
        `${threshold}c pattern hits modifier text "${mod}": ${pattern}`,
      );
    }
  }
});

test("never builds on text a generated name could contain", () => {
  // Every captured beast shows a name the game spells out of a prefix word and
  // a suffix word — Dark + mauler. The search reads it, so a fragment that can
  // land inside one would match beasts at random.
  const names: string[] = [];
  for (const prefix of MONSTER_NAME_PREFIXES) {
    for (const suffix of MONSTER_NAME_SUFFIXES) names.push(prefix + suffix);
  }
  for (const title of MONSTER_NAME_TITLES.slice(0, 20)) {
    names.push(`${MONSTER_NAME_PREFIXES[0]}${MONSTER_NAME_SUFFIXES[0]} ${title}`);
  }

  for (const threshold of [4, 20, 150]) {
    const { wanted, unwanted } = split(threshold);
    const { pattern } = buildBestiaryRegex(wanted, unwanted);
    assert.ok(pattern, `no pattern at ${threshold}c`);

    const collision = names.find((name) => matchesBestiaryPattern(pattern, name));
    assert.equal(
      collision,
      undefined,
      `${threshold}c pattern "${pattern}" matches the name "${collision}"`,
    );
  }
});

test("returns null rather than a pattern over the limit", () => {
  const { wanted, unwanted } = split(2);
  const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted, 10);
  assert.equal(pattern, null);
  assert.deepEqual(overmatched, []);
});

test("spends its length budget on precision", () => {
  // A bigger budget admits every pattern a smaller one did, so it can only
  // match the same number of unwanted beasts or fewer.
  const { wanted, unwanted } = split(5);
  const roomy = buildBestiaryRegex(wanted, unwanted, MAX_PATTERN_LENGTH);
  assert.ok(roomy.pattern);

  // Smallest budget this data still admits, so the comparison is meaningful.
  let tight = null;
  for (let budget = 20; budget < roomy.pattern.length; budget += 10) {
    const attempt = buildBestiaryRegex(wanted, unwanted, budget);
    if (attempt.pattern) {
      tight = attempt;
      break;
    }
  }
  assert.ok(tight?.pattern, "no budget below the full one produced a pattern");
  assert.ok(
    roomy.overmatched.length <= tight.overmatched.length,
    `roomy ${roomy.overmatched.length} vs tight ${tight.overmatched.length}`,
  );
});

test("never emits a literal space", () => {
  // The search field does not treat a space as a plain character: a "l p"
  // fragment matched "Sulphuric Scorpion", which shares no substring with the
  // beast it was built for. Word breaks travel as a "." wildcard instead.
  for (const threshold of THRESHOLDS) {
    const { wanted, unwanted } = split(threshold);
    const { pattern } = buildBestiaryRegex(wanted, unwanted);
    assert.doesNotMatch(
      pattern ?? "",
      / /,
      `${threshold}c contains a space: ${pattern}`,
    );
  }
});

test("matches accented names with an ASCII pattern", () => {
  const { pattern } = buildBestiaryRegex(
    [{ name: "Black Mórrigan" }],
    BEASTS.filter((b) => b.name !== "Black Mórrigan").map(entry),
  );
  assert.match(pattern!, /^[a-z.|^]+$/);
  assert.ok(matchesBestiaryPattern(pattern!, "Black Mórrigan"));
});

/**
 * The contract: a pattern is either refused, or it fits the field, matches
 * every beast it was built for, and has declared every beast it should not
 * match. Refusal is a real outcome — barring modifier text from fragments
 * leaves large selections with no pattern that fits.
 */
function assertSound(
  label: string,
  wanted: ReturnType<typeof entry>[],
  unwanted: ReturnType<typeof entry>[],
) {
  const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted);
  if (!pattern) {
    assert.deepEqual(overmatched, [], `${label}: refused but still reported extras`);
    return null;
  }

  assert.ok(
    pattern.length <= MAX_PATTERN_LENGTH,
    `${label}: ${pattern.length} chars`,
  );

  const missed = wanted
    .filter((e) => !matchesBestiaryPattern(pattern, rowOf(e)))
    .map((e) => e.name);
  assert.deepEqual(missed, [], `${label}: missed ${missed.length} beasts`);

  const extra = unwanted
    .filter((e) => matchesBestiaryPattern(pattern, rowOf(e)))
    .map((e) => e.name);
  assert.deepEqual(extra.sort(), [...overmatched].sort(), `${label}: undeclared extras`);

  return pattern;
}

for (const threshold of THRESHOLDS) {
  test(`keep pattern is sound at ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    assertSound(`${threshold}c keep`, wanted, unwanted);
  });

  test(`reverse pattern is sound at ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    assertSound(`${threshold}c reverse`, unwanted, wanted);
  });
}

test("still produces a pattern for a small selection", () => {
  const { wanted, unwanted } = split(150);
  const pattern = assertSound("150c keep", wanted, unwanted);
  assert.ok(pattern, "a handful of beasts must still be expressible");
});
