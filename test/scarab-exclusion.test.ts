import assert from "node:assert/strict";
import test from "node:test";
import {
  KEYSTONES,
  priceMechanics,
  unclaimedScarabs,
  type Keystone,
} from "../src/lib/scarab-exclusion.ts";
import type { ExchangeItem } from "../src/lib/ninja.ts";

const scarab = (name: string, chaosValue: number): ExchangeItem => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  icon: "https://web.poecdn.com/x.png",
  chaosValue,
});

/** A stand-in economy, so the arithmetic is checked against known numbers. */
const MARKET: ExchangeItem[] = [
  scarab("Ambush Scarab", 2),
  scarab("Ambush Scarab of Potency", 10),
  scarab("Ambush Scarab of Hidden Compartments", 30),
  scarab("Betrayal Scarab", 5),
  scarab("Betrayal Scarab of Reinforcements", 15),
  // Belongs to no keystone below, and must not be swept into one.
  scarab("Cartography Scarab of Risk", 99),
  // Begins with a word one of the prefixes is a prefix of. "Ambushing" is not
  // "Ambush", and a match on the bare string would claim it.
  scarab("Ambushing Scarab of Nothing", 1000),
];

const FAKE: Keystone[] = [
  {
    id: "ambush",
    keystone: "Fake Ambush Keystone",
    disables: "Strongboxes",
    prefixes: ["Ambush"],
  },
  {
    id: "betrayal",
    keystone: "Fake Betrayal Keystone",
    disables: "Betrayal",
    prefixes: ["Betrayal"],
  },
  {
    id: "absent",
    keystone: "Fake Keystone With No Scarabs",
    disables: "Something unpriced",
    prefixes: ["Nonexistent"],
  },
];

test("a scarab goes to the keystone that turns its content off", () => {
  const priced = priceMechanics(MARKET, FAKE);
  assert.deepEqual(
    priced.map((m) => m.id),
    ["ambush", "betrayal"],
  );
  assert.deepEqual(
    priced[0].scarabs.map((s) => s.name),
    [
      "Ambush Scarab of Hidden Compartments",
      "Ambush Scarab of Potency",
      "Ambush Scarab",
    ],
  );
});

test("a keystone the exchange prices nothing for is left out", () => {
  // Shown at zero it would look like the cheapest content to give up, which
  // is the one wrong answer this page could give.
  const priced = priceMechanics(MARKET, FAKE);
  assert.ok(!priced.some((m) => m.id === "absent"));
});

test("the three ways of comparing are all computed", () => {
  const [ambush, betrayal] = priceMechanics(MARKET, FAKE);
  assert.equal(ambush.total, 42);
  assert.equal(ambush.average, 14);
  assert.equal(ambush.top, 30);
  assert.equal(betrayal.total, 20);
  assert.equal(betrayal.average, 10);
  assert.equal(betrayal.top, 15);
});

test("the scarabs of a keystone come dearest first", () => {
  for (const mechanic of priceMechanics(MARKET, FAKE)) {
    const values = mechanic.scarabs.map((s) => s.chaosValue);
    assert.deepEqual(
      values,
      [...values].sort((a, b) => b - a),
    );
  }
});

test("a row says the part of the name the heading has not said", () => {
  const [ambush] = priceMechanics(MARKET, FAKE);
  assert.deepEqual(
    ambush.scarabs.map((s) => s.short),
    ["of Hidden Compartments", "of Potency", "Scarab"],
  );
});

test("a family is matched on a whole word, not on a run of letters", () => {
  // "Ambushing Scarab of Nothing" is worth more than the rest put together,
  // so claiming it would put its keystone at the top of the page.
  const [ambush] = priceMechanics(MARKET, FAKE);
  assert.ok(!ambush.scarabs.some((s) => s.name.startsWith("Ambushing")));
  assert.ok(
    unclaimedScarabs(MARKET, FAKE).some((s) => s.name.startsWith("Ambushing")),
  );
});

test("what no keystone claims is what no keystone can take from you", () => {
  const left = unclaimedScarabs(MARKET, FAKE).map((s) => s.name);
  assert.deepEqual(left, [
    "Cartography Scarab of Risk",
    "Ambushing Scarab of Nothing",
  ]);
});

test("nothing is priced when the exchange answers with nothing", () => {
  assert.deepEqual(priceMechanics([], FAKE), []);
  assert.deepEqual(unclaimedScarabs([], FAKE), []);
});

test("every keystone is named once and knows what it takes away", () => {
  const ids = KEYSTONES.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = KEYSTONES.map((k) => k.keystone);
  assert.equal(new Set(names).size, names.length);

  for (const keystone of KEYSTONES) {
    assert.match(keystone.id, /^[a-z-]+$/, keystone.keystone);
    assert.ok(keystone.keystone.length > 0, keystone.id);
    assert.ok(keystone.disables.length > 0, keystone.id);
    if (keystone.note) assert.ok(keystone.note.endsWith("."), keystone.id);
    // Every one but the scarabless has a family to take away from you.
    assert.equal(keystone.prefixes.length > 0, !keystone.scarabless);
  }
});

test("the twelve are twelve, and one of them takes no scarabs", () => {
  assert.equal(KEYSTONES.length, 12);
  assert.deepEqual(
    KEYSTONES.filter((k) => k.scarabless).map((k) => k.id),
    ["straight-and-narrow"],
  );
});

test("the four families not named after their mechanic are claimed", () => {
  // These are the ones a string comparison against the mechanic would miss:
  // mercenaries are Trarthan, ore deposits are Kalguuran, the Sacred Grove is
  // Harvest, and Smuggler's Caches have nothing at all.
  const by = (id: string) => KEYSTONES.find((k) => k.id === id)!;
  assert.deepEqual([...by("civil-war-in-trarthus").prefixes], ["Trarthan"]);
  assert.deepEqual([...by("miners-strike").prefixes], ["Kalguuran"]);
  assert.deepEqual([...by("black-thumb").prefixes], ["Harvest"]);
  assert.deepEqual([...by("straight-and-narrow").prefixes], []);
});

test("a scarabless passive is kept, at the zero that is its answer", () => {
  const only = KEYSTONES.filter((k) => k.scarabless);
  const [priced] = priceMechanics([], only);
  assert.equal(priced.total, 0);
  assert.equal(priced.average, 0);
  assert.equal(priced.top, 0);
  assert.deepEqual(priced.scarabs, []);
});

test("no two keystones fish in the same pool", () => {
  // A scarab that two keystones both claim would be counted twice, and both
  // of them would read as more expensive to take than they are.
  const prefixes = KEYSTONES.flatMap((k) => k.prefixes);
  assert.equal(new Set(prefixes).size, prefixes.length);
});
