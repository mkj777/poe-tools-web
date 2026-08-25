import assert from "node:assert/strict";
import test from "node:test";
import { ago, minutesSince } from "../src/lib/refresh.ts";

const min = 60_000;

test("minutesSince counts the minutes that have passed", () => {
  assert.equal(minutesSince(0, 10 * min), 10);
  assert.equal(minutesSince(8 * min, 15 * min), 7);
});

test("a part of a minute has not passed yet", () => {
  assert.equal(minutesSince(0, 59_000), 0);
  assert.equal(minutesSince(0, 90_000), 1);
});

test("a clock that runs ahead reads as now, not as the future", () => {
  assert.equal(minutesSince(5 * min, 0), 0);
});

test("ago puts the minutes into words", () => {
  assert.equal(ago(0), "just now");
  assert.equal(ago(1), "1 min ago");
  assert.equal(ago(59), "59 min ago");
});

test("ago reaches for hours once there are some", () => {
  assert.equal(ago(60), "1 h ago");
  assert.equal(ago(125), "2 h 5 min ago");
  assert.equal(ago(1440), "24 h ago");
});
