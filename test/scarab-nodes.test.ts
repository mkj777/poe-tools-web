import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import {
  BOOSTS,
  EXCLUSIONS,
  priceNodes,
  type ScarabNode,
} from "../src/lib/scarab-nodes.ts";
import type { ExchangeItem } from "../src/lib/ninja.ts";
import { SCARAB_TIERS } from "../src/lib/scarab-tiers.ts";

const scarab = (name: string, chaosValue: number): ExchangeItem => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  icon: "https://web.poecdn.com/x.png",
  chaosValue,
});

/** The weights `expected` is built on, repeated so the sums below are read. */
const W = { common: 616, uncommon: 414, rare: 210, mythic: 24 };

const node = (prefix: string): ScarabNode => ({
  id: prefix.toLowerCase(),
  notable: prefix,
  effect: "Something.",
  prefixes: [prefix],
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

const FAKE: ScarabNode[] = [
  {
    id: "ambush",
    notable: "Fake Ambush Notable",
    effect: "Disables Strongboxes.",
    prefixes: ["Ambush"],
  },
  {
    id: "betrayal",
    notable: "Fake Betrayal Notable",
    effect: "Disables Betrayal.",
    prefixes: ["Betrayal"],
  },
  {
    id: "absent",
    notable: "Fake Notable With No Scarabs",
    effect: "Disables something unpriced.",
    prefixes: ["Nonexistent"],
  },
];

test("a scarab goes to the keystone that turns its content off", () => {
  const priced = priceNodes(MARKET, FAKE);
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
  const priced = priceNodes(MARKET, FAKE);
  assert.ok(!priced.some((m) => m.id === "absent"));
});

test("the three ways of comparing are all computed", () => {
  const [ambush, betrayal] = priceNodes(MARKET, FAKE);
  assert.equal(ambush.total, 42);
  assert.equal(ambush.average, 14);
  assert.equal(ambush.top, 30);
  assert.equal(betrayal.total, 20);
  assert.equal(betrayal.average, 10);
  assert.equal(betrayal.top, 15);
});

test("what a drop is worth counts a scarab for as often as it drops", () => {
  // The whole reason the number exists. Ambush Scarab of Containment is the
  // dear one and it is mythic, so it moves the answer by almost nothing.
  const [ambush] = priceNodes(
    [
      scarab("Ambush Scarab", 10), // common
      scarab("Ambush Scarab of Potency", 4), // uncommon
      scarab("Ambush Scarab of Containment", 200), // mythic
    ],
    [node("Ambush")],
  );
  const pool = W.common + W.uncommon + W.mythic;
  assert.equal(
    ambush.expected,
    (W.common * 10 + W.uncommon * 4 + W.mythic * 200) / pool,
  );
  // Against 71.3 for the flat average and 200 for the dearest.
  assert.ok(ambush.expected < 12, String(ambush.expected));
});

test("a scarab's share of its family is its share of the drops", () => {
  const [ambush] = priceNodes(
    [scarab("Ambush Scarab", 10), scarab("Ambush Scarab of Containment", 200)],
    [node("Ambush")],
  );
  const shares = Object.fromEntries(ambush.scarabs.map((s) => [s.name, s.share]));
  assert.equal(shares["Ambush Scarab"], W.common / (W.common + W.mythic));
  assert.equal(
    shares["Ambush Scarab of Containment"],
    W.mythic / (W.common + W.mythic),
  );
});

test("a scarab of no known tier weighs nothing rather than weighing common", () => {
  // A scarab added since the tier table was last written. Counted as common it
  // would take over the answer for its family.
  const [ambush] = priceNodes(
    [scarab("Ambush Scarab", 10), scarab("Ambush Scarab of Nothing", 900)],
    [node("Ambush")],
  );
  assert.equal(ambush.expected, 10);
  assert.equal(ambush.scarabs.find((s) => s.chaosValue === 900)?.share, 0);
});

test("a family of no known tiers at all falls back to the flat average", () => {
  // Zero would read as a family worth nothing, which is a different claim from
  // one whose tiers this build does not know.
  const [made] = priceNodes(
    [scarab("Invented Scarab", 30), scarab("Invented Scarab of Air", 10)],
    [node("Invented")],
  );
  assert.equal(made.expected, 20);
  assert.equal(made.expected, made.average);
});

test("every scarab carries the tier its price was weighted by", () => {
  const [ambush] = priceNodes([scarab("Ambush Scarab", 10)], [node("Ambush")]);
  assert.equal(ambush.scarabs[0].tier, "common");
});

test("the scarabs of a keystone come dearest first", () => {
  for (const mechanic of priceNodes(MARKET, FAKE)) {
    const values = mechanic.scarabs.map((s) => s.chaosValue);
    assert.deepEqual(
      values,
      [...values].sort((a, b) => b - a),
    );
  }
});

test("a scarab keeps the whole name the game gave it", () => {
  // It used to be shortened against the family in the heading, which left the
  // plain one of every family reading as "Scarab" and nothing else.
  const [ambush] = priceNodes(MARKET, FAKE);
  assert.deepEqual(
    ambush.scarabs.map((s) => s.name),
    [
      "Ambush Scarab of Hidden Compartments",
      "Ambush Scarab of Potency",
      "Ambush Scarab",
    ],
  );
});

test("a family is matched on a whole word, not on a run of letters", () => {
  // "Ambushing Scarab of Nothing" is worth more than the rest put together,
  // so claiming it would put its node at the top of the page.
  const [ambush] = priceNodes(MARKET, FAKE);
  assert.ok(!ambush.scarabs.some((s) => s.name.startsWith("Ambushing")));
});

test("a family nothing belongs to takes nothing with it", () => {
  const priced = priceNodes(MARKET, FAKE);
  const claimed = priced.flatMap((n) => n.scarabs.map((s) => s.name));
  // Cartography belongs to no node in FAKE, so it is nobody's to lose.
  assert.ok(!claimed.includes("Cartography Scarab of Risk"));
});

test("nothing is priced when the exchange answers with nothing", () => {
  assert.deepEqual(priceNodes([], FAKE), []);
});

test("every keystone is named once and knows what it takes away", () => {
  const ids = EXCLUSIONS.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = EXCLUSIONS.map((k) => k.notable);
  assert.equal(new Set(names).size, names.length);

  for (const keystone of EXCLUSIONS) {
    assert.match(keystone.id, /^[a-z-]+$/, keystone.notable);
    assert.ok(keystone.notable.length > 0, keystone.id);
    assert.ok(keystone.effect.endsWith("."), keystone.id);
    // Every one but the scarabless has a family to take away from you.
    assert.equal(keystone.prefixes.length > 0, !keystone.scarabless);
  }
});

test("the twelve are twelve, and one of them takes no scarabs", () => {
  assert.equal(EXCLUSIONS.length, 12);
  assert.deepEqual(
    EXCLUSIONS.filter((k) => k.scarabless).map((k) => k.id),
    ["straight-and-narrow"],
  );
});

test("the four families not named after their mechanic are claimed", () => {
  // These are the ones a string comparison against the mechanic would miss:
  // mercenaries are Trarthan, ore deposits are Kalguuran, the Sacred Grove is
  // Harvest, and Smuggler's Caches have nothing at all.
  const by = (id: string) => EXCLUSIONS.find((k) => k.id === id)!;
  assert.deepEqual([...by("civil-war-in-trarthus").prefixes], ["Trarthan"]);
  assert.deepEqual([...by("miners-strike").prefixes], ["Kalguuran"]);
  assert.deepEqual([...by("black-thumb").prefixes], ["Harvest"]);
  assert.deepEqual([...by("straight-and-narrow").prefixes], []);
});

test("a scarabless passive is kept, at the zero that is its answer", () => {
  const only = EXCLUSIONS.filter((k) => k.scarabless);
  const [priced] = priceNodes([], only);
  assert.equal(priced.total, 0);
  assert.equal(priced.average, 0);
  assert.equal(priced.top, 0);
  assert.equal(priced.expected, 0);
  assert.deepEqual(priced.scarabs, []);
});

test("no two nodes of a list fish in the same pool", () => {
  // A scarab that two nodes both claim would be counted twice, and both of
  // them would read as worth more than they are.
  for (const list of [EXCLUSIONS, BOOSTS]) {
    const prefixes = list.flatMap((k) => k.prefixes);
    assert.equal(new Set(prefixes).size, prefixes.length);
  }
});

test("every passive wears the icon the Atlas tree draws for it", () => {
  // Exact case: what serves these is case sensitive, and this machine is not.
  // Run `node scripts/fetch-atlas-icons.mjs` when a passive is added.
  const files = new Set(
    readdirSync(new URL("../public/atlas/", import.meta.url)),
  );
  for (const node of [...EXCLUSIONS, ...BOOSTS]) {
    assert.ok(files.has(`${node.id}.png`), `public/atlas/${node.id}.png`);
  }
  // And nothing left behind by a passive that has since gone.
  assert.equal(files.size, EXCLUSIONS.length + BOOSTS.length);
});

test("the nine Carapaces are nine, and each finds one family", () => {
  assert.equal(BOOSTS.length, 9);
  for (const boost of BOOSTS) {
    assert.match(boost.notable, /Carapaces$/, boost.id);
    assert.equal(boost.prefixes.length, 1, boost.id);
    assert.ok(!boost.scarabless, boost.id);
  }
  const ids = BOOSTS.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("not one of the nine is named after what it finds", () => {
  // Which is the whole reason the mapping is a table: Tainted is Beyond and
  // Trapping is Ambush, and no amount of reading the name gets you there.
  for (const boost of BOOSTS) {
    const family = boost.prefixes[0];
    assert.ok(
      !boost.notable.includes(family),
      `${boost.notable} says ${family}`,
    );
  }
});

test("what you can switch off and what you can find are different families", () => {
  // True at 3.29.3 and worth knowing: no family is both disabled by one
  // passive and boosted by another, so the two lists never argue.
  const off = new Set(EXCLUSIONS.flatMap((n) => n.prefixes));
  for (const boost of BOOSTS) {
    assert.ok(!off.has(boost.prefixes[0]), boost.notable);
  }
});

test("a boost is priced from the same list the exclusions are", () => {
  const found = priceNodes(
    [
      scarab("Ambush Scarab of Potency", 10),
      scarab("Ambush Scarab", 2),
      scarab("Legion Scarab", 7),
    ],
    BOOSTS,
  );
  assert.deepEqual(
    found.map((n) => n.id),
    ["trapping-carapaces"],
  );
  assert.equal(found[0].total, 12);
  assert.equal(found[0].top, 10);
});

test("every scarab a node fishes for has a tier to be weighted by", () => {
  // The answer the page leads with is built on these. A family half of which
  // has no tier is a family whose number is quietly the average again.
  // Run `node scripts/fetch-scarab-tiers.mjs` when a league adds scarabs.
  const names = Object.keys(SCARAB_TIERS);
  for (const node of [...EXCLUSIONS, ...BOOSTS]) {
    if (node.scarabless) continue;
    const family = names.filter((n) =>
      node.prefixes.some((p) => n.startsWith(`${p} `)),
    );
    assert.ok(family.length > 0, `${node.notable} has no scarabs at all`);
    for (const name of family) assert.ok(SCARAB_TIERS[name], name);
  }
});

test("the tier table is the whole of what drops, not part of it", () => {
  // 115 at 3.29.1, every one of them tiered. A short table would mean the
  // weighting had quietly gone missing for whatever it dropped.
  const tiers = Object.values(SCARAB_TIERS);
  assert.equal(tiers.length, 115);
  assert.ok(tiers.every(Boolean));
});
