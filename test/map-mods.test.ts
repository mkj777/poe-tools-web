import assert from "node:assert/strict";
import test from "node:test";
import { MAP_MOD_LINES } from "../src/lib/map-mods.ts";

test("the scrape produced a plausible number of lines", () => {
  assert.ok(
    MAP_MOD_LINES.length > 150 && MAP_MOD_LINES.length < 400,
    `expected roughly 177 lines, got ${MAP_MOD_LINES.length}`,
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
