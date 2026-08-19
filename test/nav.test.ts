import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS, activeTool, swapLeague, toolHref } from "../src/lib/nav.ts";

test("beasts is the tool with the empty slug", () => {
  assert.equal(TOOLS[0].slug, "");
  assert.equal(TOOLS[0].label, "Beasts");
  assert.ok(TOOLS.some((t) => t.slug === "wealth"));
});

test("toolHref builds the path for a tool", () => {
  assert.equal(toolHref("allflame", ""), "/allflame");
  assert.equal(toolHref("allflame", "wealth"), "/allflame/wealth");
});

test("activeTool reads the tool out of a pathname", () => {
  assert.equal(activeTool("/allflame"), "");
  assert.equal(activeTool("/allflame/"), "");
  assert.equal(activeTool("/allflame/wealth"), "wealth");
  assert.equal(activeTool("/allflamehc/wealth"), "wealth");
});

test("activeTool ignores a segment that is not a tool", () => {
  // The simulation is its own page, not a tool tab.
  assert.equal(activeTool("/allflame/simulation"), "");
});

test("swapLeague keeps the tool", () => {
  assert.equal(swapLeague("/allflame/wealth", "standard"), "/standard/wealth");
  assert.equal(swapLeague("/allflame", "standard"), "/standard");
});

test("swapLeague sends an unknown page back to that tool's root", () => {
  assert.equal(swapLeague("/allflame/simulation", "standard"), "/standard");
});

test("swapLeague survives an empty pathname", () => {
  assert.equal(swapLeague("", "standard"), "/standard");
  assert.equal(swapLeague("/", "standard"), "/standard");
});
