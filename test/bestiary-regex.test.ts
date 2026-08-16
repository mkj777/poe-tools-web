import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  matchesBestiaryPattern,
  planBestiaryPatterns,
  MAX_PATTERN_LENGTH,
} from "../src/lib/bestiary-regex.ts";
import { BESTIARY_MOD_TEXT } from "../src/lib/bestiary-mods.ts";
import { MONSTER_MOD_TEXT } from "../src/lib/monster-mods.ts";
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

/**
 * The contract, and the whole point of the tool: running every step selects
 * exactly the wanted beasts. No step may match anything else, no matter how
 * many steps that takes, and whatever cannot be reached at all is named.
 */
function assertExact(
  label: string,
  wanted: ReturnType<typeof entry>[],
  unwanted: ReturnType<typeof entry>[],
) {
  const { steps, unreachable } = planBestiaryPatterns(wanted, unwanted);

  for (const [i, step] of steps.entries()) {
    assert.ok(
      step.pattern.length <= MAX_PATTERN_LENGTH,
      `${label} step ${i + 1}: ${step.pattern.length} chars`,
    );

    const stray = unwanted
      .filter((e) => matchesBestiaryPattern(step.pattern, rowOf(e)))
      .map((e) => e.name);
    assert.deepEqual(stray, [], `${label} step ${i + 1} also matches: ${stray}`);
  }

  const selected = new Set(
    wanted
      .filter((e) =>
        steps.some((s) => matchesBestiaryPattern(s.pattern, rowOf(e))),
      )
      .map((e) => e.name),
  );
  const missed = wanted
    .map((e) => e.name)
    .filter((name) => !selected.has(name) && !unreachable.includes(name));
  assert.deepEqual(missed, [], `${label}: ${missed.length} silently dropped`);

  return { steps, unreachable };
}

test("empty input produces no steps", () => {
  const plan = planBestiaryPatterns([], [{ name: "Parasite" }]);
  assert.deepEqual(plan.steps, []);
  assert.deepEqual(plan.unreachable, []);
});

test("isolates a beast from similarly named ones", () => {
  const { steps } = planBestiaryPatterns(
    [{ name: "Craicic Croaker" }],
    ["Craicic Chimeral", "Craicic Savage Crab", "Gravel Eater"].map((name) => ({
      name,
    })),
  );
  assert.equal(steps.length, 1);
  assert.ok(matchesBestiaryPattern(steps[0].pattern, "Craicic Croaker"));
  assert.ok(!matchesBestiaryPattern(steps[0].pattern, "Craicic Chimeral"));
});

test("anchoring isolates a name that ends other names", () => {
  const { steps, unreachable } = planBestiaryPatterns(
    [{ name: "Parasite" }],
    [{ name: "Plated Parasite" }, { name: "Vicious Parasite" }],
  );
  assert.deepEqual(unreachable, []);
  assert.ok(steps[0].pattern.startsWith("^"), steps[0].pattern);
});

test("names what no search can single out", () => {
  // A name that begins another one cannot be isolated even with an anchor.
  const { steps, unreachable } = planBestiaryPatterns(
    [{ name: "Craicic Maw" }],
    [{ name: "Craicic Mawbeast" }],
  );
  assert.deepEqual(steps, []);
  assert.deepEqual(unreachable, ["Craicic Maw"]);
});

test("splits into more searches rather than losing precision", () => {
  const { wanted, unwanted } = split(1);
  const { steps } = assertExact("1c trash-sized set", wanted, unwanted);
  assert.ok(steps.length > 1, "expected this many beasts to need several");
});

test("matches substrings, not subsequences", () => {
  // Searching "wldbrstl" in game returned nothing at all, not even "Wild
  // Bristle Matron", so the field does not skip characters.
  assert.ok(!matchesBestiaryPattern("wldbrstl", "Wild Bristle Matron"));
});

test("never builds on text a modifier also carries", () => {
  // Every beast can roll up to three modifiers and the search reads them, so
  // "far" pulls in anything with "Farric Presence" whatever its type.
  for (const threshold of [4, 20, 150]) {
    const { wanted, unwanted } = split(threshold);
    const { steps } = planBestiaryPatterns(wanted, unwanted);

    for (const step of steps) {
      for (const mod of BESTIARY_MOD_TEXT) {
        assert.ok(
          !matchesBestiaryPattern(step.pattern, mod),
          `${threshold}c hits modifier text "${mod}": ${step.pattern}`,
        );
      }
    }
  }
});

test("never builds on text a generic monster modifier carries", () => {
  // Not just the Bestiary modifiers: a captured beast rolls ordinary rare
  // monster mods too, and the Bestiary prints those as well. "Wild Hellion
  // Alpha" — 50c — came back for a trash pattern built at 2c, and its row
  // showed Stonemaul, Soul Eater and Life Cannot Be Leeched.
  for (const threshold of [2, 4, 20, 150]) {
    const { wanted, unwanted } = split(threshold);
    const { steps } = planBestiaryPatterns(wanted, unwanted);

    for (const step of steps) {
      for (const mod of MONSTER_MOD_TEXT) {
        assert.ok(
          !matchesBestiaryPattern(step.pattern, mod),
          `${threshold}c hits monster modifier text "${mod}": ${step.pattern}`,
        );
      }
    }
  }
});

test("keeps unanchored fragments long enough to miss prose", () => {
  // No list of modifier text is ever complete, so a fragment free to land
  // anywhere has to be long: "rar" sits inside "Rare pack minions", "c.ly"
  // inside "quickly". Anchored ones only meet the start of a line and may be
  // shorter.
  for (const threshold of THRESHOLDS) {
    const { wanted, unwanted } = split(threshold);
    for (const step of planBestiaryPatterns(wanted, unwanted).steps) {
      for (const alternative of step.pattern.split("|")) {
        if (alternative.startsWith("^")) continue;
        assert.ok(
          alternative.length >= 6,
          `${threshold}c: unanchored "${alternative}" is too short`,
        );
      }
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
    const { steps } = planBestiaryPatterns(wanted, unwanted);

    for (const step of steps) {
      const collision = names.find((name) =>
        matchesBestiaryPattern(step.pattern, name),
      );
      assert.equal(
        collision,
        undefined,
        `${threshold}c "${step.pattern}" matches the name "${collision}"`,
      );
    }
  }
});

test("never emits a literal space", () => {
  // The search field does not treat a space as a plain character: a "l p"
  // fragment matched "Sulphuric Scorpion", which shares no substring with the
  // beast it was built for. Word breaks travel as a "." wildcard instead.
  for (const threshold of THRESHOLDS) {
    const { wanted, unwanted } = split(threshold);
    for (const step of planBestiaryPatterns(wanted, unwanted).steps) {
      assert.doesNotMatch(step.pattern, / /, `${threshold}c: ${step.pattern}`);
    }
  }
});

test("matches accented names with an ASCII pattern", () => {
  const { steps } = planBestiaryPatterns(
    [{ name: "Black Mórrigan" }],
    BEASTS.filter((b) => b.name !== "Black Mórrigan").map(entry),
  );
  assert.equal(steps.length, 1);
  assert.match(steps[0].pattern, /^[a-z.|^]+$/);
  assert.ok(matchesBestiaryPattern(steps[0].pattern, "Black Mórrigan"));
});

for (const threshold of THRESHOLDS) {
  test(`selling at ${threshold}c is exact`, () => {
    const { wanted, unwanted } = split(threshold);
    assertExact(`${threshold}c sell`, wanted, unwanted);
  });

  test(`trashing under ${threshold}c is exact`, () => {
    const { wanted, unwanted } = split(threshold);
    assertExact(`${threshold}c trash`, unwanted, wanted);
  });
}
