import assert from "node:assert/strict";
import test from "node:test";
import {
  MOD_GROUPS,
  looseLines,
  matchesQuery,
} from "../src/lib/map-mod-groups.ts";

const reflect = MOD_GROUPS.find((g) => g.id === "reflect")!;
const noRegen = MOD_GROUPS.find((g) => g.id === "no-regen")!;

test("an empty query matches everything", () => {
  assert.equal(matchesQuery(reflect, ""), true);
  assert.equal(matchesQuery(reflect, "   "), true);
});

test("a query matches the label a player would use", () => {
  assert.equal(matchesQuery(reflect, "reflect"), true);
  assert.equal(matchesQuery(reflect, "REFL"), true);
});

test("a query matches the game's own wording, not just the label", () => {
  // "Thorns" appears in the modifier text but never in the label "Reflect".
  assert.ok(reflect.lines.some((line) => line.includes("Thorns")));
  assert.equal(reflect.label.toLowerCase().includes("thorns"), false);
  assert.equal(matchesQuery(reflect, "thorns"), true);
});

test("the # standing in for a rolled number never blocks a match", () => {
  const withHash = {
    id: "x",
    label: "x",
    lines: ["#% increased Monster Damage"] as readonly string[],
  };

  assert.equal(matchesQuery(withHash, "increased monster"), true);
  assert.equal(matchesQuery(withHash, "% increased"), true);
});

test("a query spanning label and lines does not match", () => {
  assert.equal(matchesQuery(noRegen, "regeneration reflect"), false);
});

test("an unrelated query matches nothing", () => {
  assert.equal(matchesQuery(reflect, "bestiary"), false);
});

test("every loose line is reachable by searching its own text", () => {
  for (const line of looseLines()) {
    const entry = { id: line, label: line.replace(/#/g, "x"), lines: [line] };
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
