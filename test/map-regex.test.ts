import assert from "node:assert/strict";
import test from "node:test";
import { MAP_MOD_LINES } from "../src/lib/map-mods.ts";
import { MOD_GROUPS, REWARD_LINES } from "../src/lib/map-mod-groups.ts";
import {
  ITEM_CHROME,
  REWARD_STATS,
  atLeastPattern,
  planMapSearch,
  statTerm,
} from "../src/lib/map-regex.ts";

/** The literal stretches of a line, the parts a fragment may be cut from. */
const segments = (line: string) =>
  line
    .split("#")
    .map((s) => s.trim())
    .filter(Boolean);

/** Does this fragment occur in the text a map with these lines would show? */
const occursIn = (fragment: string, lines: readonly string[]) =>
  lines.some((line) =>
    segments(line).some((seg) =>
      seg.toLowerCase().includes(fragment.toLowerCase()),
    ),
  );

test("an empty selection produces an empty search", () => {
  const plan = planMapSearch([]);
  assert.equal(plan.search, "");
  assert.deepEqual(plan.fragments, []);
});

test("every fragment matches every line it claims to cover", () => {
  for (const group of MOD_GROUPS) {
    const plan = planMapSearch(group.lines);
    for (const fragment of plan.fragments) {
      for (const line of fragment.covers) {
        assert.ok(
          occursIn(fragment.text, [line]),
          `${group.id}: ${fragment.text} does not occur in ${line}`,
        );
      }
    }
  }
});

test("no fragment touches a line that was not banned", () => {
  for (const group of MOD_GROUPS) {
    const banned = new Set(group.lines);
    const allowed = MAP_MOD_LINES.filter((l) => !banned.has(l));
    const plan = planMapSearch(group.lines);
    for (const fragment of plan.fragments) {
      for (const line of allowed) {
        assert.ok(
          !occursIn(fragment.text, [line]),
          `${group.id}: ${fragment.text} also dims ${line}`,
        );
      }
    }
  }
});

test("no fragment touches the reward lines or the item chrome", () => {
  for (const group of MOD_GROUPS) {
    for (const fragment of planMapSearch(group.lines).fragments) {
      assert.ok(
        !occursIn(fragment.text, REWARD_LINES),
        `${group.id}: ${fragment.text} dims every rolled map`,
      );
      assert.ok(
        !occursIn(fragment.text, ITEM_CHROME),
        `${group.id}: ${fragment.text} dims every map`,
      );
    }
  }
});

test("every group is reachable on its own", () => {
  for (const group of MOD_GROUPS) {
    assert.deepEqual(
      planMapSearch(group.lines).unreachable,
      [],
      `${group.id} has a line no fragment can single out`,
    );
  }
});

test("banning everything at once still leaves nothing unreachable", () => {
  const all = MAP_MOD_LINES.filter((l) => !REWARD_LINES.includes(l));
  assert.deepEqual(planMapSearch(all).unreachable, []);
});

test("the search is one negated quoted term", () => {
  const plan = planMapSearch([
    "Players are Cursed with Temporal Chains",
    "Monsters cannot be Leeched from",
  ]);
  assert.match(plan.search, /^"!\([^"]+\)"$/);
  assert.ok(!/\d/.test(plan.search), "a fragment carried a digit");
});

test("Temporal Chains does not collide with Temporarily Revive", () => {
  // The whole reason the avoid corpus exists: `Tempora` reaches both, and only
  // one of them was banned.
  const plan = planMapSearch(["Players are Cursed with Temporal Chains"]);
  for (const fragment of plan.fragments) {
    assert.ok(
      !occursIn(fragment.text, [
        "Rare monsters in area Temporarily Revive on death",
      ]),
      `${fragment.text} also dims Temporarily Revive`,
    );
  }
});

const quantity = REWARD_STATS.find((s) => s.id === "quantity")!;

/** Every number the pattern accepts, read back the way a regex engine would. */
const accepts = (min: number, value: number) =>
  new RegExp(`^(${atLeastPattern(min)})$`).test(String(value));

test("the threshold pattern accepts exactly the numbers at or above it", () => {
  // Three digits is what the generator promises, and far past anything a map
  // prints: its quantity and rarity come from its own affixes.
  for (const min of [1, 2, 5, 9, 10, 27, 30, 79, 99, 100, 124, 250, 999]) {
    for (let value = 0; value <= 999; value++) {
      assert.equal(
        accepts(min, value),
        value >= min,
        `min ${min} judged ${value} wrongly`,
      );
    }
  }
});

test("a threshold reads the property block the game prints", () => {
  const term = statTerm(quantity, 30)!;
  const body = term.slice(1, -1);

  // "Item Quantity: +71%", with the dot standing in for the plus.
  assert.ok(new RegExp(body).test("Item Quantity: +71%"));
  assert.ok(new RegExp(body).test("Item Quantity: +30%"));
  assert.ok(new RegExp(body).test("Item Quantity: +124%"));
  assert.ok(!new RegExp(body).test("Item Quantity: +29%"));
  assert.ok(!new RegExp(body).test("Item Quantity: +8%"));
  assert.ok(!new RegExp(body).test("Item Rarity: +71%"));

  // The wildcard digits cannot reach past the percent sign, which is the whole
  // reason they are allowed to be wildcards.
  assert.ok(!new RegExp(body).test("Item Quantity: +3%"));
});

test("a minimum of one asks only that the line is there", () => {
  // The game prints nothing for a stat of zero, so presence is the same
  // question, and far shorter than spelling out every number from one up.
  assert.equal(statTerm(quantity, 1), '"Quantity:"');
  assert.equal(statTerm(quantity, 0), null);
  assert.equal(statTerm(quantity, -5), null);
});

test("minimums stand beside the negated term, in declaration order", () => {
  const banned = ["Players are Cursed with Temporal Chains"];
  const plain = planMapSearch(banned);
  const withMinimums = planMapSearch(banned, {
    minimums: { packSize: 25, quantity: 60 },
  });

  assert.equal(
    withMinimums.search,
    `${statTerm(quantity, 60)} ${statTerm(REWARD_STATS[2], 25)} ${plain.search}`,
  );
  // AND-joined terms, so asking for more cannot change what the exclusion says.
  assert.deepEqual(withMinimums.fragments, plain.fragments);
});

test("minimums on their own still ask for something", () => {
  assert.equal(
    planMapSearch([], { minimums: { quantity: 1 } }).search,
    '"Quantity:"',
  );
  assert.equal(planMapSearch([], { minimums: {} }).search, "");
});

test("every stat needle reaches its own line and no other", () => {
  const lines = [
    "Item Quantity: +71%",
    "Item Rarity: +41%",
    "Monster Pack Size: +27%",
  ];

  REWARD_STATS.forEach((stat, i) => {
    lines.forEach((line, j) => {
      assert.equal(
        line.includes(stat.needle),
        i === j,
        `${stat.needle} against ${line}`,
      );
    });
  });
});

test("one fragment covers both reflect lines", () => {
  const reflect = MOD_GROUPS.find((g) => g.id === "reflect")!;
  assert.equal(
    planMapSearch(reflect.lines).fragments.length,
    1,
    "Elemental Thorns and Physical Thorns share enough text for one fragment",
  );
});
