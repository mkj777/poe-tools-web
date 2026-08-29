import assert from "node:assert/strict";
import test from "node:test";
import { EXTERNAL_TOOLS, toolByName } from "../src/lib/tools.ts";

test("every tool has a name, a blurb and an https link", () => {
  assert.ok(EXTERNAL_TOOLS.length >= 12);
  for (const tool of EXTERNAL_TOOLS) {
    assert.ok(tool.name.length > 0, tool.name);
    assert.ok(tool.blurb.length > 0, tool.name);
    // Two lines in the column, same as the tools of this site.
    assert.ok(tool.blurb.length <= 40, `${tool.name}: ${tool.blurb}`);
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

test("every entry wears an icon of its own, and a square one is rounded off", () => {
  for (const tool of EXTERNAL_TOOLS) {
    assert.match(tool.icon.src, /^\/[^/]+\.(png|webp|svg|ico)$/, tool.name);
  }

  // A logo is a square somebody else drew, so its corners come off to sit in
  // the column. An item cut out of the game, or the scales drawn on nothing,
  // has no corners to take.
  assert.deepEqual(
    EXTERNAL_TOOLS.filter((t) => t.icon.rounded).map((t) => t.name),
    [
      "Path of Building",
      "FilterBlade",
      "Awakened PoE Trade",
      "poe.ninja",
      "Wealthy Exile",
      "PoE Antiquary",
      "PoE Regex",
    ],
  );
});

test("poe.ninja is its front page, which is builds as well as prices", () => {
  const ninja = toolByName("poe.ninja");
  // The league paths it used to be handed answer with nothing.
  assert.equal(ninja.href("Allflame"), "https://poe.ninja");
  assert.equal(ninja.href("Hardcore Allflame"), "https://poe.ninja");
  assert.equal(ninja.blurb, "Builds and economy");
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

test("the disenchanting tool spells its leagues the way poe.ninja does", () => {
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
    "poe.ninja",
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
    ["Path of Building", "https://pathofbuilding.community/"],
    ["FilterBlade", "https://www.filterblade.xyz/?game=Poe1"],
    [
      "Awakened PoE Trade",
      "https://snosme.github.io/awakened-poe-trade/download",
    ],
    ["Wealthy Exile", "https://wealthyexile.com/"],
    ["PoE Antiquary", "https://poe-antiquary.xyz/"],
    ["Timeless Jewels", "https://vilsol.github.io/timeless-jewels"],
    [
      "Cluster Jewels",
      "https://theodorejbieber.github.io/PoEClusterJewelCalculator/",
    ],
    ["PoE Regex", "https://poe.re"],
    ["PoELab", "https://www.poelab.com/"],
  ];
  for (const [name, url] of expected) {
    assert.equal(toolByName(name).href("Allflame"), url, name);
  }
});

test("asking for a tool that is not in the list is a mistake, not undefined", () => {
  assert.throws(() => toolByName("Nonexistent"), /Nonexistent/);
  assert.throws(() => toolByName(""), /No external tool named/);
});
