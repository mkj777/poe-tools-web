import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS, activeTool, swapLeague, toolHref } from "../src/lib/nav.ts";

test("the beasts table is the tool at the root", () => {
  assert.deepEqual(
    TOOLS.map((t) => [t.slug, t.label]),
    [
      ["", "Beasts"],
      ["maps", "Maps"],
    ],
  );
});

test("every tool wears an icon", () => {
  for (const tool of TOOLS) {
    assert.match(tool.icon.src, /^\/[^/].*\.(png|webp)$/, tool.label);
    // Decoration beside a label that already names the tool.
    assert.equal(tool.icon.alt, "");
  }
});

test("maps is a tool", () => {
  assert.ok(TOOLS.some((t) => t.slug === "maps"));
  assert.equal(activeTool("/allflame/maps"), "maps");
  assert.equal(swapLeague("/allflame/maps", "allflamehc"), "/allflamehc/maps");
});

test("toolHref builds the path for a tool", () => {
  assert.equal(toolHref("allflame", ""), "/allflame");
  assert.equal(toolHref("allflame", "beasts"), "/allflame/beasts");
});

test("activeTool reads the tool out of a pathname", () => {
  assert.equal(activeTool("/allflame"), "");
  assert.equal(activeTool("/allflame/"), "");
  assert.equal(activeTool("/allflamehc"), "");
});

test("activeTool ignores a segment that is not a tool", () => {
  // The simulation is a page of the beasts tool, not a tab of its own.
  assert.equal(activeTool("/allflame/simulation"), "");
  assert.equal(activeTool("/allflame/whatever"), "");
});

test("swapLeague keeps the tool", () => {
  assert.equal(swapLeague("/allflame", "standard"), "/standard");
  assert.equal(swapLeague("/allflamehc", "standard"), "/standard");
});

test("swapLeague sends a page that is not a tool back to that tool's root", () => {
  assert.equal(swapLeague("/allflame/simulation", "standard"), "/standard");
});

test("swapLeague survives an empty pathname", () => {
  assert.equal(swapLeague("", "standard"), "/standard");
  assert.equal(swapLeague("/", "standard"), "/standard");
});
