import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleBeasts,
  existsIn,
  keepsYellowBeasts,
} from "../src/lib/beast-list.ts";
import type { TradePrice } from "../src/lib/trade-prices.ts";

const price = (chaosValue: number, listingCount = 1): TradePrice => ({
  chaosValue,
  listingCount,
  checkedAt: "2026-11-22T00:00:00.000Z",
});

/** A trade snapshot that knows every name it is asked about, and records the ask. */
function snapshot(asked: string[][]) {
  return (missing: string[]) => {
    asked.push(missing);
    return new Map(missing.map((name) => [name, price(2)]));
  };
}

test("only Standard and Hardcore still have yellow beasts", () => {
  assert.equal(keepsYellowBeasts("Standard"), true);
  assert.equal(keepsYellowBeasts("Hardcore"), true);
  assert.equal(keepsYellowBeasts("Covens"), false);
  assert.equal(keepsYellowBeasts("Hardcore Covens"), false);
});

test("a red beast and a First One exist everywhere, a yellow beast only in the permanent leagues", () => {
  assert.equal(existsIn("Covens", "Farric Ape"), true);
  assert.equal(existsIn("Covens", "Farrul, First of the Plains"), true);
  assert.equal(existsIn("Covens", "Black Mórrigan"), true);
  assert.equal(existsIn("Covens", "Crypt Ambusher"), false);
  assert.equal(existsIn("Standard", "Crypt Ambusher"), true);
});

test("a challenge league drops yellow beasts from both poe.ninja and the trade fallback", () => {
  const asked: string[][] = [];
  const beasts = assembleBeasts(
    "Covens",
    [
      { id: 1, name: "Craicic Croaker", chaosValue: 395 },
      { id: 2, name: "Crypt Ambusher", chaosValue: 1 },
    ],
    ["Craicic Croaker", "Crypt Ambusher", "Wild Rhex", "Vile Imp"],
    snapshot(asked),
  );

  assert.deepEqual(
    beasts.map((b) => b.name),
    ["Craicic Croaker", "Wild Rhex"],
  );
  assert.ok(beasts.every((b) => b.rarity === "red"));
  // The yellow names are never even looked up.
  assert.deepEqual(asked, [["Wild Rhex"]]);
});

test("Standard keeps every beast, yellow ones included, as before 3.30", () => {
  const beasts = assembleBeasts(
    "Standard",
    [{ id: 1, name: "Crypt Ambusher", chaosValue: 1 }],
    ["Crypt Ambusher", "Vile Imp", "Wild Rhex"],
    snapshot([]),
  );

  assert.deepEqual(
    beasts.map((b) => [b.name, b.source, b.rarity]),
    [
      ["Crypt Ambusher", "ninja", "yellow"],
      ["Vile Imp", "trade", "yellow"],
      ["Wild Rhex", "trade", "red"],
    ],
  );
});

test("a fallback name the snapshot cannot price keeps an undefined value and no listings", () => {
  const [beast] = assembleBeasts("Covens", [], ["Wild Rhex"], () => new Map());
  assert.equal(beast.chaosValue, undefined);
  assert.equal(beast.listingCount, 0);
  assert.equal(beast.source, "trade");
  assert.equal(beast.id, -1);
});

test("fallback rows are sorted by name and numbered below zero", () => {
  const beasts = assembleBeasts(
    "Covens",
    [],
    ["Wild Rhex", "Farric Ape"],
    snapshot([]),
  );
  assert.deepEqual(
    beasts.map((b) => [b.id, b.name]),
    [
      [-1, "Farric Ape"],
      [-2, "Wild Rhex"],
    ],
  );
});
