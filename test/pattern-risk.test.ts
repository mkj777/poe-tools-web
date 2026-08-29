import assert from "node:assert/strict";
import test from "node:test";
import { patternRisks } from "../src/lib/pattern-risk.ts";

test("a fragment nothing in the pool can produce carries no risk", () => {
  assert.deepEqual(patternRisks("xyzxyzxyz-not-a-real-fragment"), []);
});

test("a fragment that only turns up in an ordinary monster mod is a modifier risk", () => {
  // "rar" is not inside any generated name, but it is inside "Temporarily
  // Revives", an everyday rare monster mod that could sit on any beast.
  const risks = patternRisks("rar");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].kind, "modifier");
  assert.equal(risks[0].fragment, "rar");
});

test("a fragment that occurs in a generated name is caught before it is checked against modifiers", () => {
  // Every generated name is prefix+suffix, so any substring spanning a whole
  // suffix, like "back" (Wild Brambleback, Farric Goliath's family etc.), is
  // caught as a name risk.
  const risks = patternRisks("back");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].kind, "generated name");
});

test("a fragment can only be caught straddling a name and its title", () => {
  // "der th" matches nothing as a bare prefix+suffix, only where a name ending
  // in "der" runs into " the <title>".
  const risks = patternRisks("der th");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].kind, "generated name");
  assert.match(risks[0].example, /the /);
});

test("an empty pattern has no fragments to check", () => {
  assert.deepEqual(patternRisks(""), []);
});

test("each fragment of a piped pattern is checked, and a repeat is not checked twice", () => {
  const once = patternRisks("rar");
  const twice = patternRisks("rar|rar");
  assert.deepEqual(twice, once);
});

test("an empty fragment between two pipes is skipped rather than flagged", () => {
  assert.deepEqual(patternRisks("|rar|"), patternRisks("rar"));
});
