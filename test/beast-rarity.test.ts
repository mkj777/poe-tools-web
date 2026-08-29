import assert from "node:assert/strict";
import test from "node:test";
import { RED_BEASTS, rarityOf } from "../src/lib/beast-rarity.ts";

test("a beast on the red list comes back red", () => {
  assert.equal(rarityOf("Black Mórrigan"), "red");
  assert.equal(rarityOf("Wild Rhex"), "red");
});

test("matching a red beast ignores case", () => {
  assert.equal(rarityOf("black mórrigan"), "red");
  assert.equal(rarityOf("BLACK MÓRRIGAN"), "red");
});

test("every beast off the list is yellow, the common case", () => {
  assert.equal(rarityOf("Crypt Ambusher"), "yellow");
  assert.equal(rarityOf(""), "yellow");
});

test("the diacritic in a red beast's name has to match, not just fold to ASCII", () => {
  // "Black Morrigan" without the accent is a different string from the one on
  // the list, so it stays yellow rather than being treated as the same beast.
  assert.equal(rarityOf("Black Morrigan"), "yellow");
});

test("the red list has no duplicate entries", () => {
  assert.equal(
    new Set(RED_BEASTS.map((n) => n.toLowerCase())).size,
    RED_BEASTS.length,
  );
});
