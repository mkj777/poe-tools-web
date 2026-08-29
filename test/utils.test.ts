import assert from "node:assert/strict";
import test from "node:test";
import { cn, num } from "../src/lib/utils.ts";

test("cn merges classes, and a later conflicting one wins", () => {
  // tailwind-merge's whole job: two paddings collapse to the one written last.
  assert.equal(cn("p-2", "p-4"), "p-4");
});

test("cn drops falsy inputs and keeps the rest in order", () => {
  assert.equal(
    cn("text-red-500", false && "hidden", null, undefined, "font-bold"),
    "text-red-500 font-bold",
  );
});

test("cn with nothing at all is an empty string", () => {
  assert.equal(cn(), "");
});

test("num splits thousands with a narrow space, the game's own style", () => {
  assert.equal(num(173838), "173 838");
});

test("num defaults to zero decimals and rounds to whole chaos", () => {
  assert.equal(num(1234.5, 2), "1 234.50");
});

test("num with no value at all reads as zero, not as NaN", () => {
  assert.equal(num(undefined), "0");
});

test("num keeps the minus sign on a negative amount", () => {
  assert.equal(num(-1234), "-1 234");
});

test("num at zero needs no thousands separator", () => {
  assert.equal(num(0), "0");
});
