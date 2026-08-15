import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBestiaryRegex,
  matchesBestiaryPattern,
  MAX_PATTERN_LENGTH,
} from "../src/lib/bestiary-regex.ts";

type Fixture = { name: string; chaosValue: number };

/** A real Allflame beast overview from poe.ninja — 218 lines. */
const BEASTS: Fixture[] = JSON.parse(
  readFileSync(new URL("./beasts.fixture.json", import.meta.url), "utf8"),
);

const THRESHOLDS = [1, 2, 3, 5, 10, 20, 30, 100, 175];

function split(threshold: number) {
  return {
    wanted: BEASTS.filter((b) => b.chaosValue >= threshold).map((b) => b.name),
    unwanted: BEASTS.filter((b) => b.chaosValue < threshold).map((b) => b.name),
  };
}

test("empty input produces no pattern", () => {
  const { pattern, overmatched } = buildBestiaryRegex([], ["Parasite"]);
  assert.equal(pattern, null);
  assert.deepEqual(overmatched, []);
});

test("isolates a beast from similarly named ones", () => {
  const { pattern, overmatched } = buildBestiaryRegex(
    ["Craicic Croaker"],
    ["Craicic Chimeral", "Craicic Savage Crab", "Gravel Eater"],
  );
  assert.ok(matchesBestiaryPattern(pattern!, "Craicic Croaker"));
  assert.ok(!matchesBestiaryPattern(pattern!, "Craicic Chimeral"));
  assert.deepEqual(overmatched, []);
});

test("reports beasts no fragment can exclude", () => {
  const { pattern, overmatched } = buildBestiaryRegex(
    ["Parasite"],
    ["Plated Parasite", "Vicious Parasite"],
  );
  assert.ok(matchesBestiaryPattern(pattern!, "Parasite"));
  assert.deepEqual(overmatched.sort(), ["Plated Parasite", "Vicious Parasite"]);
});

test("survives a search that matches subsequences", () => {
  // "Farric Ursa" came back in game for a pattern containing "fir" and "ris":
  // both appear in "fa-r-r-ic u-r-s-a" in order but not next to each other.
  // A fragment that hits a cheap beast that way must never be picked.
  const { wanted, unwanted } = split(4);
  const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted);
  assert.ok(pattern);

  for (const name of ["Farric Ursa", "Farric Lynx Alpha"]) {
    if (overmatched.includes(name)) continue;
    assert.ok(
      !matchesBestiaryPattern(pattern, name),
      `${name} matches unreported: ${pattern}`,
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
  // match the same number of cheap beasts or fewer.
  const { wanted, unwanted } = split(5);
  const tight = buildBestiaryRegex(wanted, unwanted, 60);
  const roomy = buildBestiaryRegex(wanted, unwanted, MAX_PATTERN_LENGTH);
  assert.ok(tight.pattern, "expected the tight budget to still produce one");
  assert.ok(roomy.pattern);
  assert.ok(
    roomy.overmatched.length < tight.overmatched.length,
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
    ["Black Mórrigan"],
    BEASTS.filter((b) => b.name !== "Black Mórrigan").map((b) => b.name),
  );
  assert.match(pattern!, /^[a-z.|]+$/);
  assert.ok(matchesBestiaryPattern(pattern!, "Black Mórrigan"));
});

for (const threshold of THRESHOLDS) {
  test(`fits the search field at ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    const { pattern } = buildBestiaryRegex(wanted, unwanted);
    assert.ok(pattern, `no pattern produced for ${threshold}c`);
    assert.ok(
      pattern.length <= MAX_PATTERN_LENGTH,
      `${pattern.length} chars at ${threshold}c`,
    );
  });

  test(`never misses a beast worth at least ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted);

    const missed = wanted.filter((n) => !matchesBestiaryPattern(pattern!, n));
    assert.deepEqual(missed, [], `pattern missed ${missed.length} beasts`);

    // Every false positive must be one the caller was told about.
    const extra = unwanted.filter((n) => matchesBestiaryPattern(pattern!, n));
    assert.deepEqual(extra.sort(), [...overmatched].sort());
  });

  test(`inverts cleanly at ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    const { pattern, overmatched } = buildBestiaryRegex(unwanted, wanted);
    assert.ok(pattern, `no inverse pattern produced for ${threshold}c`);
    assert.ok(pattern.length <= MAX_PATTERN_LENGTH);

    const missed = unwanted.filter((n) => !matchesBestiaryPattern(pattern, n));
    assert.deepEqual(missed, [], `inverse missed ${missed.length} beasts`);

    const extra = wanted.filter((n) => matchesBestiaryPattern(pattern, n));
    assert.deepEqual(extra.sort(), [...overmatched].sort());
  });
}
