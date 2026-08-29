import assert from "node:assert/strict";
import test from "node:test";
import { rollCapture } from "../src/lib/capture.ts";
import { BLOOD_ALTAR } from "../src/lib/observed-mods.ts";

test("a comma title attaches with no space, unlike a 'the …' title", () => {
  // Salt 92 on this name rolls a title starting with a comma ("Dominus'
  // Favoured" style). The prefix+suffix base runs straight into it.
  const capture = rollCapture(
    { id: 1, name: "Test Beast", rarity: "yellow" },
    92,
  );
  assert.match(capture.name, /^[A-Za-z]+,/, capture.name);
  assert.ok(!capture.name.includes(" ,"), capture.name);
});

test("the rare one-in-many-hundred roll can carry the Blood Altar survival mod", () => {
  const capture = rollCapture(
    { id: 1, name: "Test Beast", rarity: "yellow" },
    0,
  );
  assert.ok(capture.monsterMods.includes(BLOOD_ALTAR));
  assert.ok(capture.lines.includes(BLOOD_ALTAR));
});

test("a yellow beast rolls one Bestiary mod, a red beast rolls three", () => {
  const yellow = rollCapture(
    { id: 1, name: "Crypt Ambusher", rarity: "yellow" },
    0,
  );
  const red = rollCapture({ id: 2, name: "Farric Ape", rarity: "red" }, 0);
  assert.equal(yellow.bestiaryMods.length, 1);
  assert.equal(red.bestiaryMods.length, 3);
});

test("a beast with no rarity at all rolls the yellow amount", () => {
  const capture = rollCapture({ id: 1, name: "No Rarity Beast" }, 0);
  assert.equal(capture.bestiaryMods.length, 1);
});

test("no roll ever repeats a mod on the same beast", () => {
  for (let salt = 0; salt < 50; salt++) {
    const capture = rollCapture(
      { id: 1, name: "Repeat Check Beast", rarity: "red" },
      salt,
    );
    assert.equal(
      new Set(capture.bestiaryMods).size,
      capture.bestiaryMods.length,
    );
    assert.equal(new Set(capture.monsterMods).size, capture.monsterMods.length);
  }
});

test("a beast with no baseType at all contributes no trait lines", () => {
  const capture = rollCapture(
    { id: 1, name: "Traitless Beast", rarity: "yellow" },
    0,
  );
  // Name, type, "Level: 83", the bestiary mods and the monster mods, nothing
  // else, since baseType is undefined and splits to nothing.
  assert.equal(
    capture.lines.length,
    2 + 1 + capture.bestiaryMods.length + capture.monsterMods.length,
  );
});

test("baseType's pipe-separated genus, family and habitat each become their own line", () => {
  const capture = rollCapture(
    {
      id: 1,
      name: "Traited Beast",
      baseType: "Goliaths|Unnaturals|The Wilds",
      rarity: "yellow",
    },
    0,
  );
  assert.ok(capture.lines.includes("Goliaths"));
  assert.ok(capture.lines.includes("Unnaturals"));
  assert.ok(capture.lines.includes("The Wilds"));
});

test("the same beast name and salt always rolls the same capture, elsewhere too", () => {
  const a = rollCapture({ id: 1, name: "Determinism Beast", rarity: "red" }, 7);
  const b = rollCapture(
    { id: 99, name: "Determinism Beast", rarity: "red" },
    7,
  );
  // id does not feed the seed, only the name and salt do, so two different
  // ids for the same name still roll identically.
  assert.deepEqual(a, b);
});

test("a different salt on the same beast name rolls a different capture", () => {
  const a = rollCapture({ id: 1, name: "Salt Beast", rarity: "red" }, 0);
  const b = rollCapture({ id: 1, name: "Salt Beast", rarity: "red" }, 1);
  assert.notDeepEqual(a, b);
});

test("level is always 83, the level every Bestiary capture is shown at", () => {
  const capture = rollCapture(
    { id: 1, name: "Level Beast", rarity: "yellow" },
    0,
  );
  assert.equal(capture.level, 83);
  assert.ok(capture.lines.includes("Level: 83"));
});
