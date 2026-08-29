import assert from "node:assert/strict";
import test from "node:test";
import {
  MOD_GROUPS,
  displayLine,
  looseLines,
  matchesQuery,
} from "../src/lib/map-mod-groups.ts";

const reflect = MOD_GROUPS.find((g) => g.id === "reflect")!;
const noRegen = MOD_GROUPS.find((g) => g.id === "no-regen")!;

test("an empty query matches everything", () => {
  assert.equal(matchesQuery(reflect, ""), true);
  assert.equal(matchesQuery(reflect, "   "), true);
});

test("a query is matched against the game's wording, and case is ignored", () => {
  // Both of these are in the modifier text. There is no second vocabulary: a
  // group has no name of its own, so the wording is the only thing to search.
  assert.equal(matchesQuery(reflect, "reflecting"), true);
  assert.equal(matchesQuery(reflect, "THORNS"), true);
  assert.equal(matchesQuery(reflect, "Rare Monsters"), true);
});

test("the # standing in for a rolled number never blocks a match", () => {
  const withHash = {
    id: "x",
    lines: ["#% increased Monster Damage"] as readonly string[],
  };

  assert.equal(matchesQuery(withHash, "increased monster"), true);
  assert.equal(matchesQuery(withHash, "% increased"), true);
});

test("a query spanning two lines does not match", () => {
  // Each line is searched on its own, the way the game matches one.
  assert.ok(noRegen.lines.some((l) => l.includes("Regenerate")));
  assert.ok(noRegen.lines.some((l) => l.includes("Recharge")));
  assert.equal(matchesQuery(noRegen, "Regenerate Recharge"), false);
});

test("an unrelated query matches nothing", () => {
  assert.equal(matchesQuery(reflect, "bestiary"), false);
});

test("displayLine turns every rolled number back into a placeholder x", () => {
  assert.equal(
    displayLine("#% increased Monster Damage"),
    "x% increased Monster Damage",
  );
  assert.equal(
    displayLine("Monsters deal #% extra Physical Damage as #% #"),
    "Monsters deal x% extra Physical Damage as x% x",
  );
});

test("displayLine leaves a line with no # untouched", () => {
  assert.equal(displayLine("Area is inhabited by Ghosts"), "Area is inhabited by Ghosts");
});

test("every loose line is reachable by searching its own text", () => {
  for (const line of looseLines()) {
    const entry = { id: line, lines: [line] };
    const word = line
      .replace(/#/g, " ")
      .split(/\s+/)
      .find((w) => /^[a-z]{5,}$/i.test(w));

    if (word === undefined) continue;
    assert.equal(
      matchesQuery(entry, word),
      true,
      `loose line unreachable by "${word}": ${line}`,
    );
  }
});
