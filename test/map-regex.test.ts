import assert from "node:assert/strict";
import test from "node:test";
import { MAP_MOD_LINES } from "../src/lib/map-mods.ts";
import { MOD_GROUPS, REWARD_LINES } from "../src/lib/map-mod-groups.ts";
import { ITEM_CHROME, planMapSearch } from "../src/lib/map-regex.ts";

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

test("one fragment covers both reflect lines", () => {
  const reflect = MOD_GROUPS.find((g) => g.id === "reflect")!;
  assert.equal(
    planMapSearch(reflect.lines).fragments.length,
    1,
    "Elemental Thorns and Physical Thorns share enough text for one fragment",
  );
});
