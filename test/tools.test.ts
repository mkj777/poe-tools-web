import assert from "node:assert/strict";
import test from "node:test";
import {
  EXTERNAL_TOOLS,
  MENU_TOOLS,
  PINNED_TOOLS,
  toolByName,
} from "../src/lib/tools.ts";

test("every tool has a name and an https link", () => {
  assert.ok(EXTERNAL_TOOLS.length >= 6);
  for (const tool of EXTERNAL_TOOLS) {
    assert.ok(tool.name.length > 0, tool.name);
    assert.match(tool.href("Allflame"), /^https:\/\//, tool.name);
  }
});

test("trade carries the league the way Path of Exile spells it", () => {
  const trade = toolByName("Trade");
  assert.equal(
    trade.href("Allflame"),
    "https://www.pathofexile.com/trade/search/Allflame",
  );
  assert.equal(
    trade.href("Hardcore Allflame"),
    "https://www.pathofexile.com/trade/search/Hardcore%20Allflame",
  );
});

test("poe.ninja carries the league the way poe.ninja spells it", () => {
  const ninja = toolByName("poe.ninja");
  assert.equal(
    ninja.href("Allflame"),
    "https://poe.ninja/poe1/economy/allflame",
  );
  assert.equal(
    ninja.href("Hardcore Allflame"),
    "https://poe.ninja/poe1/economy/allflamehc",
  );
});

test("the tools that know no league ignore it", () => {
  for (const name of [
    "FilterBlade",
    "Wealthy Exile",
    "Awakened PoE Trade",
    "Path of Building",
  ]) {
    const tool = toolByName(name);
    assert.equal(tool.href("Allflame"), tool.href("Standard"), name);
  }
});

test("the links point where they are supposed to", () => {
  assert.equal(
    toolByName("FilterBlade").href("Allflame"),
    "https://www.filterblade.xyz/?game=Poe1",
  );
  assert.equal(
    toolByName("Wealthy Exile").href("Allflame"),
    "https://wealthyexile.com/",
  );
  assert.equal(
    toolByName("Awakened PoE Trade").href("Allflame"),
    "https://snosme.github.io/awakened-poe-trade/download",
  );
  assert.equal(
    toolByName("Path of Building").href("Allflame"),
    "https://pathofbuilding.community/",
  );
});

test("asking for a tool that is not in the list is a mistake, not undefined", () => {
  assert.throws(() => toolByName("Nonexistent"), /Nonexistent/);
});

test("the three in the bar carry their own logo, the menu carries none", () => {
  for (const tool of PINNED_TOOLS) {
    assert.match(tool.icon ?? "", /^\/[^/].*\.(png|webp)$/, tool.name);
  }
  for (const tool of MENU_TOOLS) {
    assert.equal(tool.icon, undefined, tool.name);
  }
});

test("the bar carries the three that get opened on their own", () => {
  assert.deepEqual(
    PINNED_TOOLS.map((t) => t.name),
    ["FilterBlade", "Awakened PoE Trade", "Path of Building"],
  );
});

test("the menu carries the rest, and between them nothing is lost", () => {
  assert.deepEqual(
    MENU_TOOLS.map((t) => t.name),
    ["Wealthy Exile", "Trade", "poe.ninja"],
  );
  assert.equal(
    PINNED_TOOLS.length + MENU_TOOLS.length,
    EXTERNAL_TOOLS.length,
    "every tool is in exactly one of the two",
  );
});
