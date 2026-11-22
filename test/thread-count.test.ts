import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_THREADS,
  MIN_THREADS,
  threadCount,
} from "../src/lib/thread-count.ts";

test("a map takes one to eight Threads", () => {
  assert.equal(MIN_THREADS, 1);
  assert.equal(MAX_THREADS, 8);
});

test("a typed count in range reads as itself", () => {
  for (let n = 1; n <= 8; n++) assert.equal(threadCount(String(n)), n);
});

test("an empty or unreadable field counts as the default of one", () => {
  assert.equal(threadCount(""), 1);
  assert.equal(threadCount("abc"), 1);
});

test("a count out of range is held to the nearest bound", () => {
  assert.equal(threadCount("0"), 1);
  assert.equal(threadCount("9"), 8);
  assert.equal(threadCount("40"), 8);
});
