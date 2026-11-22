import assert from "node:assert/strict";
import test from "node:test";
import { MAP_MOD_LINES } from "../src/lib/map-mods.ts";

test("the scrape produced a plausible number of lines", () => {
  assert.ok(
    MAP_MOD_LINES.length > 150 && MAP_MOD_LINES.length < 400,
    `expected roughly 186 lines, got ${MAP_MOD_LINES.length}`,
  );
});

test("no line carries markup or wiki entities", () => {
  for (const line of MAP_MOD_LINES) {
    assert.ok(!/[<>]/.test(line), `markup left in: ${line}`);
    assert.ok(!/&[a-z#0-9]+;/i.test(line), `entity left in: ${line}`);
    assert.ok(!/\[\[/.test(line), `wiki link left in: ${line}`);
  }
});

test("every number became a single #", () => {
  for (const line of MAP_MOD_LINES) {
    assert.ok(!/\d/.test(line), `digit left in: ${line}`);
    assert.ok(!/#\s*#/.test(line), `unmerged number range in: ${line}`);
  }
});

test("hidden lines and Vaal side area lines are gone", () => {
  for (const line of MAP_MOD_LINES) {
    assert.ok(!/\(Hidden\)/.test(line), `hidden line kept: ${line}`);
    assert.ok(!/Vaal Vessel/.test(line), `Vaal side area line kept: ${line}`);
  }
});

test("the lines that the groups and the solver rely on are present", () => {
  for (const line of [
    "Players are Cursed with Temporal Chains",
    "Monsters cannot be Leeched from",
    "Rare Monsters have Elemental Thorns reflecting # Elemental Damage",
    "Rare Monsters have Physical Thorns reflecting # Physical Damage",
    "Players cannot Regenerate Life, Mana or Energy Shield",
    "Rare monsters in area Temporarily Revive on death",
  ]) {
    assert.ok(MAP_MOD_LINES.includes(line), `missing line: ${line}`);
  }
});

test("lines are unique and sorted", () => {
  assert.equal(new Set(MAP_MOD_LINES).size, MAP_MOD_LINES.length);
  assert.deepEqual([...MAP_MOD_LINES].sort(), [...MAP_MOD_LINES]);
});

test("3.30 renamed lines replaced the old wording", () => {
  // Item Quantity became Atlas Drops, Scarabs became Threads, and "nearby"
  // became a range in metres. The old wording must be gone, or a fragment
  // would be cut from text no map shows any more.
  const renamed: [old: string, now: string][] = [
    [
      "#% increased Quantity of Items found in this Area",
      "#% increased Atlas Drops in this Area",
    ],
    ["#% more Scarabs found in Area", "#% more Threads found in Area"],
    [
      "This Area's Modifiers to Quantity of Items found also apply to Rarity",
      "This Area's Modifiers to Atlas Drops also apply to Item Rarity",
    ],
    [
      "Players in Area take #% increased Damage per nearby Ally",
      "Players in Area take #% increased Damage per Ally within # metres",
    ],
  ];
  for (const [old, now] of renamed) {
    assert.ok(!MAP_MOD_LINES.includes(old), `old wording kept: ${old}`);
    assert.ok(MAP_MOD_LINES.includes(now), `new wording missing: ${now}`);
  }
});
