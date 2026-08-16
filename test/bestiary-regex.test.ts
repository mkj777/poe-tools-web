import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBestiaryRegex,
  matchesBestiaryPattern,
  MAX_PATTERN_LENGTH,
} from "../src/lib/bestiary-regex.ts";

type Fixture = { name: string; chaosValue: number; baseType?: string };

/** A real Allflame beast overview from poe.ninja — 218 lines. */
const BEASTS: Fixture[] = JSON.parse(
  readFileSync(new URL("./beasts.fixture.json", import.meta.url), "utf8"),
);

const THRESHOLDS = [1, 2, 3, 5, 10, 20, 30, 100, 175];

/** What the Bestiary row shows: name, genus, family, habitat. */
const entry = (b: Fixture) => ({
  name: b.name,
  text: `${b.name} ${(b.baseType ?? "").split("|").join(" ")}`.trim(),
});

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

test("reports beasts no fragment can exclude", () => {
  const { pattern, overmatched } = buildBestiaryRegex(
    [{ name: "Parasite" }],
    [{ name: "Plated Parasite" }, { name: "Vicious Parasite" }],
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
    const row = unwanted.find((e) => e.name === name);
    assert.ok(
      !matchesBestiaryPattern(pattern, row?.text ?? name),
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

    const missed = wanted.filter((e) => !matchesBestiaryPattern(pattern!, e.text)).map((e) => e.name);
    assert.deepEqual(missed, [], `pattern missed ${missed.length} beasts`);

    // Every false positive must be one the caller was told about.
    const extra = unwanted.filter((e) => matchesBestiaryPattern(pattern!, e.text)).map((e) => e.name);
    assert.deepEqual(extra.sort(), [...overmatched].sort());
  });

  test(`inverts cleanly at ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    const { pattern, overmatched } = buildBestiaryRegex(unwanted, wanted);
    assert.ok(pattern, `no inverse pattern produced for ${threshold}c`);
    assert.ok(pattern.length <= MAX_PATTERN_LENGTH);

    const missed = unwanted.filter((e) => !matchesBestiaryPattern(pattern, e.text)).map((e) => e.name);
    assert.deepEqual(missed, [], `inverse missed ${missed.length} beasts`);

    const extra = wanted.filter((e) => matchesBestiaryPattern(pattern, e.text)).map((e) => e.name);
    assert.deepEqual(extra.sort(), [...overmatched].sort());
  });
}
