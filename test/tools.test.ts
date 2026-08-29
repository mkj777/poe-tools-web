import assert from "node:assert/strict";
import test from "node:test";
import {
  EXTERNAL_TOOLS,
  TOOL_GROUPS,
  toolByName,
  toolsIn,
} from "../src/lib/tools.ts";

test("every tool has a name, a blurb and an https link", () => {
  assert.ok(EXTERNAL_TOOLS.length >= 12);
  for (const tool of EXTERNAL_TOOLS) {
    assert.ok(tool.name.length > 0, tool.name);
    assert.ok(tool.blurb.length > 0, tool.name);
    // Two lines in a 16rem column, same as the tools of this site.
    assert.ok(tool.blurb.length <= 28, `${tool.name}: ${tool.blurb}`);
    assert.ok(!tool.blurb.endsWith("."), tool.name);
    assert.match(tool.href("Allflame"), /^https:\/\//, tool.name);
  }
});

test("no tool is listed twice", () => {
  const names = EXTERNAL_TOOLS.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  const links = EXTERNAL_TOOLS.map((t) => t.href("Allflame"));
  assert.equal(new Set(links).size, links.length);
});

test("every tool is in exactly one group, and every group has tools", () => {
  const groups = TOOL_GROUPS.map((g) => g.id);
  assert.deepEqual(groups, ["economy", "planning", "ingame"]);

  let counted = 0;
  for (const group of TOOL_GROUPS) {
    const tools = toolsIn(group.id);
    assert.ok(tools.length > 0, group.id);
    counted += tools.length;
  }
  assert.equal(counted, EXTERNAL_TOOLS.length);
});

test("a group keeps the order the list declares", () => {
  assert.deepEqual(
    toolsIn("planning").map((t) => t.name),
    ["Path of Building", "Timeless Jewels", "Cluster Jewels"],
  );
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

test("the disenchanting tool spells its leagues the same way", () => {
  const disenchant = toolByName("Disenchanting");
  assert.equal(
    disenchant.href("Allflame"),
    "https://poe-disenchant-tool.vercel.app/allflame",
  );
  assert.equal(
    disenchant.href("Hardcore Allflame"),
    "https://poe-disenchant-tool.vercel.app/allflamehc",
  );
});

test("the tools that know no league ignore the one they are handed", () => {
  for (const name of [
    "Wealthy Exile",
    "PoE Antiquary",
    "Path of Building",
    "Timeless Jewels",
    "Cluster Jewels",
    "FilterBlade",
    "Awakened PoE Trade",
    "PoE Regex",
    "PoELab",
  ]) {
    const tool = toolByName(name);
    assert.equal(tool.href("Allflame"), tool.href("Standard"), name);
  }
});

test("the links point where they are supposed to", () => {
  const expected: [string, string][] = [
    ["Wealthy Exile", "https://wealthyexile.com/"],
    ["PoE Antiquary", "https://poe-antiquary.xyz/"],
    ["Path of Building", "https://pathofbuilding.community/"],
    ["Timeless Jewels", "https://vilsol.github.io/timeless-jewels"],
    [
      "Cluster Jewels",
      "https://theodorejbieber.github.io/PoEClusterJewelCalculator/",
    ],
    ["FilterBlade", "https://www.filterblade.xyz/?game=Poe1"],
    [
      "Awakened PoE Trade",
      "https://snosme.github.io/awakened-poe-trade/download",
    ],
    ["PoE Regex", "https://poe.re"],
    ["PoELab", "https://www.poelab.com/"],
  ];
  for (const [name, url] of expected) {
    assert.equal(toolByName(name).href("Allflame"), url, name);
  }
});

test("every tool wears an icon, and no two entries share one", () => {
  const icons = EXTERNAL_TOOLS.map((t) => t.icon);
  assert.equal(new Set(icons).size, icons.length);
});

test("asking for a tool that is not in the list is a mistake, not undefined", () => {
  assert.throws(() => toolByName("Nonexistent"), /Nonexistent/);
  assert.throws(() => toolByName(""), /No external tool named/);
});
