import assert from "node:assert/strict";
import test from "node:test";
import { minutesUntil } from "../src/lib/refresh.ts";

const min = 60_000;

test("minutesUntil counts the minutes that are still to come", () => {
  assert.equal(minutesUntil(10 * min, 0), 10);
  assert.equal(minutesUntil(15 * min, 8 * min), 7);
});

test("a part of a minute still counts as one", () => {
  assert.equal(minutesUntil(min + 1, min), 1);
  assert.equal(minutesUntil(90_000, 0), 2);
});

test("nothing is left once the moment has passed", () => {
  assert.equal(minutesUntil(0, 0), 0);
  assert.equal(minutesUntil(0, 5 * min), 0);
});
