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

test("matches accented names with an ASCII pattern", () => {
  const { pattern } = buildBestiaryRegex(
    ["Black Mórrigan"],
    BEASTS.filter((b) => b.name !== "Black Mórrigan").map((b) => b.name),
  );
  assert.match(pattern, /^[a-z |]+$/);
  assert.ok(new RegExp(pattern, "i").test(normalize("Black Mórrigan")));
});

for (const threshold of [1, 5, 20, 30, 100, 175]) {
  test(`never misses a beast worth at least ${threshold}c`, () => {
    const { wanted, unwanted } = split(threshold);
    const { pattern, overmatched } = buildBestiaryRegex(wanted, unwanted);
    const matcher = new RegExp(pattern, "i");

    const missed = wanted.filter((name) => !matcher.test(normalize(name)));
    assert.deepEqual(missed, [], `pattern missed ${missed.length} beasts`);

    // Every false positive must be one the caller was told about.
    const extra = unwanted.filter((name) => matcher.test(normalize(name)));
    assert.deepEqual(extra.sort(), [...overmatched].sort());
  });
}

test("stays far shorter than listing every name", () => {
  const { wanted, unwanted } = split(20);
  const { pattern } = buildBestiaryRegex(wanted, unwanted);
  assert.ok(
    pattern.length < wanted.join("|").length / 2,
    `pattern was ${pattern.length} chars for ${wanted.length} beasts`,
  );
});
