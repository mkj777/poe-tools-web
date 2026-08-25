import assert from "node:assert/strict";
import test from "node:test";
import { MAP_MOD_LINES } from "../src/lib/map-mods.ts";
import {
  COMMON_GROUP_IDS,
  MOD_GROUPS,
  PRESETS,
  REWARD_LINES,
  looseLines,
} from "../src/lib/map-mod-groups.ts";

test("every line a group claims still exists in the scraped data", () => {
  for (const group of MOD_GROUPS) {
    for (const line of group.lines) {
      assert.ok(
        MAP_MOD_LINES.includes(line),
        `group ${group.id} claims a line that no longer exists: ${line}`,
      );
    }
  }
});

test("every reward line still exists", () => {
  for (const line of REWARD_LINES) {
    assert.ok(MAP_MOD_LINES.includes(line), `missing reward line: ${line}`);
  }
});

test("no line belongs to two groups", () => {
  const owner = new Map<string, string>();
  for (const group of MOD_GROUPS) {
    for (const line of group.lines) {
      const first = owner.get(line);
      assert.equal(
        first,
        undefined,
        `${line} is claimed by both ${first} and ${group.id}`,
      );
      owner.set(line, group.id);
    }
  }
});

test("a group never claims a reward line", () => {
  for (const group of MOD_GROUPS) {
    for (const line of group.lines) {
      assert.ok(
        !REWARD_LINES.includes(line),
        `${group.id} bans the reward line ${line}`,
      );
    }
  }
});

test("group ids are unique and every id a preset names exists", () => {
  const ids = MOD_GROUPS.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const preset of PRESETS) {
    for (const id of preset.groups) {
      assert.ok(ids.includes(id), `preset ${preset.id} names unknown ${id}`);
    }
  }
  for (const id of COMMON_GROUP_IDS) {
    assert.ok(ids.includes(id), `common list names unknown ${id}`);
  }
});

test("loose lines are everything no group and no reward claims", () => {
  const claimed = new Set([
    ...MOD_GROUPS.flatMap((g) => [...g.lines]),
    ...REWARD_LINES,
  ]);
  const loose = looseLines();
  assert.deepEqual(
    loose,
    MAP_MOD_LINES.filter((l) => !claimed.has(l)),
    "looseLines must be exactly the unclaimed lines, in scrape order",
  );
  // Nothing is unreachable: every line is either grouped, a reward, or loose.
  assert.equal(claimed.size + loose.length, MAP_MOD_LINES.length);
});
