import assert from "node:assert/strict";
import test from "node:test";
import { EXTERNAL_TOOLS, WITHOUT_ICON, toolByName } from "../src/lib/tools.ts";

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

test("the three that run beside the client wear their own logo", () => {
  for (const name of [
    "Path of Building",
    "FilterBlade",
    "Awakened PoE Trade",
  ]) {
    const { icon } = toolByName(name);
    assert.ok("src" in icon, `${name} is on a stand-in`);
    if ("src" in icon) {
      assert.match(icon.src, /^\/[^/].*\.(png|webp)$/, name);
      // Somebody else's square mark, rounded off to sit in the column.
      assert.equal(icon.rounded, true, name);
    }
  }
});

test("the entries still waiting for an icon are named, not forgotten", () => {
  assert.deepEqual(
    WITHOUT_ICON.map((t) => t.name),
    [
      "poe.ninja",
      "Trade",
      "Wealthy Exile",
      "PoE Antiquary",
      "Disenchanting",
      "Timeless Jewels",
      "Cluster Jewels",
      "PoE Regex",
      "PoELab",
    ],
  );
});

test("every stand-in names a glyph, and no two entries share one", () => {
  const glyphs = WITHOUT_ICON.map((t) =>
    "glyph" in t.icon ? t.icon.glyph : "",
  );
  assert.ok(glyphs.every(Boolean));
  assert.equal(new Set(glyphs).size, glyphs.length);
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
