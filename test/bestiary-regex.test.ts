import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildBestiaryRegex } from "../src/lib/bestiary-regex.ts";

type Fixture = { name: string; chaosValue: number };

/** A real Allflame beast overview from poe.ninja — 218 lines. */
const BEASTS: Fixture[] = JSON.parse(
  readFileSync(new URL("./beasts.fixture.json", import.meta.url), "utf8"),
);

const normalize = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");

function split(threshold: number) {
  return {
    wanted: BEASTS.filter((b) => b.chaosValue >= threshold).map((b) => b.name),
    unwanted: BEASTS.filter((b) => b.chaosValue < threshold).map((b) => b.name),
  };
}

test("empty input produces no pattern", () => {
  const { pattern, overmatched } = buildBestiaryRegex([], ["Parasite"]);
  assert.equal(pattern, "");
  assert.deepEqual(overmatched, []);
});

test("isolates a beast from similarly named ones", () => {
  const { pattern, overmatched } = buildBestiaryRegex(
    ["Craicic Croaker"],
    ["Craicic Chimeral", "Craicic Savage Crab", "Gravel Eater"],
  );
  const matcher = new RegExp(pattern, "i");
  assert.ok(matcher.test("craicic croaker"));
  assert.ok(!matcher.test("craicic chimeral"));
  assert.deepEqual(overmatched, []);
});

test("reports beasts no substring can exclude", () => {
  const { pattern, overmatched } = buildBestiaryRegex(
    ["Parasite"],
    ["Plated Parasite", "Vicious Parasite"],
  );
  assert.ok(new RegExp(pattern, "i").test("parasite"));
  assert.deepEqual(overmatched.sort(), ["Plated Parasite", "Vicious Parasite"]);
});

test("never emits a literal space, in either mode", () => {
  // The in-game search does not treat a space as a literal character: a "l p"
  // fragment pulled in "Sulphuric Scorpion", which shares no substring with the
  // beast it was built for. Word breaks have to travel as a `.` wildcard.
  for (const threshold of [1, 5, 20, 50, 150]) {
    const { wanted, unwanted } = split(threshold);
    for (const wildcard of [false, true]) {
      const { pattern } = buildBestiaryRegex(wanted, unwanted, { wildcard });
      assert.doesNotMatch(
        pattern,
        / /,
        `${threshold}c wildcard=${wildcard} contains a space: ${pattern}`,
      );
    }
  }
});

test("plain mode emits letters and pipes only", () => {
  const { wanted, unwanted } = split(20);
  const { pattern } = buildBestiaryRegex(wanted, unwanted);
  assert.match(pattern, /^[a-z|]+$/);
});

test("wildcard mode is shorter and matches fewer cheap beasts", () => {
  const { wanted, unwanted } = split(150);
  const plain = buildBestiaryRegex(wanted, unwanted);
  const wide = buildBestiaryRegex(wanted, unwanted, { wildcard: true });

  assert.ok(wide.pattern.includes("."), "expected a wildcard fragment");
  assert.ok(
    wide.overmatched.length < plain.overmatched.length,
    `wildcard ${wide.overmatched.length} vs plain ${plain.overmatched.length}`,
  );
});

test("matches accented names with an ASCII pattern", () => {
  const { pattern } = buildBestiaryRegex(
    ["Black Mórrigan"],
    BEASTS.filter((b) => b.name !== "Black Mórrigan").map((b) => b.name),
  );
  assert.match(pattern, /^[a-z|]+$/);
  assert.ok(new RegExp(pattern, "i").test(normalize("Black Mórrigan")));
});

for (const threshold of [1, 5, 20, 30, 100, 175]) {
  for (const wildcard of [false, true]) {
    test(`never misses a beast worth at least ${threshold}c (wildcard=${wildcard})`, () => {
      const { wanted, unwanted } = split(threshold);
      const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted, {
        wildcard,
      });
      const matcher = new RegExp(pattern, "i");

      const missed = wanted.filter((name) => !matcher.test(normalize(name)));
      assert.deepEqual(missed, [], `pattern missed ${missed.length} beasts`);

      // Every false positive must be one the caller was told about.
      const extra = unwanted.filter((name) => matcher.test(normalize(name)));
      assert.deepEqual(extra.sort(), [...overmatched].sort());
    });
  }
}

test("stays far shorter than listing every name", () => {
  const { wanted, unwanted } = split(20);
  const { pattern } = buildBestiaryRegex(wanted, unwanted);
  assert.ok(
    pattern.length < wanted.join("|").length / 2,
    `pattern was ${pattern.length} chars for ${wanted.length} beasts`,
  );
});
