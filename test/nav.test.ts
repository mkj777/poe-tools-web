import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import {
  HOME,
  SIDEBAR,
  SIDEBAR_ENTRIES,
  SITE_TOOLS,
  UNLISTED,
  activeTool,
  leagueFromPath,
  swapLeague,
  toolBySlug,
  toolHref,
  unlistedTools,
} from "../src/lib/nav.ts";
import { EXTERNAL_TOOLS } from "../src/lib/tools.ts";

const beasts = toolBySlug("beasts")!;
const maps = toolBySlug("maps")!;
const leveling = toolBySlug("leveling")!;

test("the site hosts three tools", () => {
  assert.deepEqual(
    SITE_TOOLS.map((t) => t.slug),
    ["beasts", "maps", "leveling"],
  );
  assert.equal(HOME.slug, "beasts");
});

test("every tool says what it is, briefly", () => {
  for (const tool of SITE_TOOLS) {
    assert.ok(tool.label.length > 0, tool.slug);
    // The blurb may take a second line in the column, and not a third.
    assert.ok(tool.blurb.length <= 40, `${tool.slug}: ${tool.blurb}`);
    assert.ok(!tool.blurb.endsWith("."), tool.slug);
  }
});

test("every tool of this site wears an icon of its own", () => {
  for (const tool of SITE_TOOLS) {
    assert.ok("src" in tool.icon, `${tool.slug} is still on a stand-in`);
    if ("src" in tool.icon) {
      assert.match(tool.icon.src, /^\/[^/].*\.(png|webp)$/, tool.slug);
    }
  }
});

test("slugs are unique and URL safe", () => {
  const slugs = SITE_TOOLS.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z]+$/);
});

test("only the tools that read prices carry a league", () => {
  assert.equal(beasts.league, true);
  assert.equal(maps.league, true);
  assert.equal(leveling.league, undefined);
});

test("a tool that carries a league puts it in the path", () => {
  assert.equal(toolHref(beasts, "allflame"), "/beasts/allflame");
  assert.equal(toolHref(maps, "allflamehc"), "/maps/allflamehc");
});

test("a tool that carries none ignores the one it is handed", () => {
  assert.equal(toolHref(leveling, "allflame"), "/leveling");
  assert.equal(toolHref(leveling), "/leveling");
});

test("a league tool without a league falls back to its bare path", () => {
  // Which is the page that resolves the league itself.
  assert.equal(toolHref(beasts), "/beasts");
  assert.equal(toolHref(beasts, ""), "/beasts");
});

test("activeTool reads the tool out of a pathname", () => {
  assert.equal(activeTool("/beasts/allflame"), "beasts");
  assert.equal(activeTool("/beasts"), "beasts");
  assert.equal(activeTool("/maps/allflamehc"), "maps");
  assert.equal(activeTool("/leveling"), "leveling");
  assert.equal(activeTool("/leveling/"), "leveling");
});

test("a page that is not listed still belongs to its tool", () => {
  // The simulation is unlisted, not homeless: the beasts entry stays lit.
  assert.equal(activeTool("/beasts/allflame/simulation"), "beasts");
});

test("a path that is no tool of ours lights nothing up", () => {
  // The old league-first URLs, on their way to the tool they have become.
  assert.equal(activeTool("/allflame"), "");
  assert.equal(activeTool("/"), "");
  assert.equal(activeTool(""), "");
  assert.equal(activeTool("/whatever/else"), "");
});

test("leagueFromPath reads the league of the tools that have one", () => {
  assert.equal(leagueFromPath("/beasts/allflame"), "allflame");
  assert.equal(leagueFromPath("/beasts/allflame/simulation"), "allflame");
  assert.equal(leagueFromPath("/maps/standard"), "standard");
  assert.equal(leagueFromPath("/beasts"), "");
  assert.equal(leagueFromPath("/leveling"), "");
  assert.equal(leagueFromPath("/allflame"), "");
  assert.equal(leagueFromPath(""), "");
});

test("swapLeague keeps the page and changes the league", () => {
  assert.equal(swapLeague("/beasts/allflame", "standard"), "/beasts/standard");
  assert.equal(
    swapLeague("/beasts/allflame/simulation", "standard"),
    "/beasts/standard/simulation",
  );
  assert.equal(swapLeague("/maps/allflame", "allflamehc"), "/maps/allflamehc");
});

test("swapLeague gives a bare tool path the league it was missing", () => {
  assert.equal(swapLeague("/beasts", "standard"), "/beasts/standard");
});

test("swapLeague leaves a page that has no league alone", () => {
  assert.equal(swapLeague("/leveling", "standard"), "/leveling");
  assert.equal(swapLeague("", "standard"), "/");
  assert.equal(swapLeague("/", "standard"), "/");
  assert.equal(swapLeague("/allflame", "standard"), "/allflame");
});

test("toolBySlug answers with nothing for a slug that is no tool", () => {
  assert.equal(toolBySlug("nonsense"), undefined);
  assert.equal(toolBySlug(""), undefined);
});

test("every icon names a file that is really in public", () => {
  // Exact case: what serves these is case sensitive, and this machine is not.
  const files = new Set(readdirSync(new URL("../public/", import.meta.url)));
  for (const entry of SIDEBAR_ENTRIES) {
    const icon = entry.kind === "page" ? entry.page.icon : entry.link.icon;
    if (!("src" in icon)) continue;
    assert.ok(files.has(icon.src.slice(1)), `public${icon.src} is missing`);
  }
});

test("the sidebar opens on what a session is spent in", () => {
  const first = SIDEBAR[0];
  assert.equal(first.id, "essentials");
  assert.deepEqual(
    first.entries.map((e) => (e.kind === "page" ? e.page.label : e.link.name)),
    [
      "Trade",
      "Path of Building",
      "FilterBlade",
      "Awakened PoE Trade",
      "PoE Regex",
    ],
  );
});

test("the pages built here come next, under their own heading", () => {
  const site = SIDEBAR[1];
  assert.equal(site.id, "site");
  assert.deepEqual(
    site.entries.map((e) => (e.kind === "page" ? e.page.slug : e.link.name)),
    ["beasts", "maps", "leveling"],
  );
});

test("what you reach for is open, the rest is one folded heading", () => {
  assert.deepEqual(
    SIDEBAR.map((g) => [g.id, Boolean(g.folded)]),
    [
      ["essentials", false],
      ["site", false],
      ["more", true],
    ],
  );

  // Eight entries on arrival rather than fifteen.
  const open = SIDEBAR.filter((g) => !g.folded).flatMap((g) => g.entries);
  assert.equal(open.length, 8);
});

test("the rest is one list, in the order it is declared", () => {
  const more = SIDEBAR.find((g) => g.id === "more");
  assert.deepEqual(
    more?.entries.map((e) => (e.kind === "link" ? e.link.name : e.page.slug)),
    [
      "poe.ninja",
      "Wealthy Exile",
      "PoE Antiquary",
      "Disenchanting",
      "Timeless Jewels",
      "Cluster Jewels",
      "PoELab",
    ],
  );
});

test("every group has a heading and something under it", () => {
  for (const group of SIDEBAR) {
    assert.ok(group.label.length > 0, group.id);
    assert.ok(group.entries.length > 0, group.id);
  }
  const ids = SIDEBAR.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("nothing in the catalogue is left out of the sidebar", () => {
  assert.deepEqual(unlistedTools(), []);
  const links = SIDEBAR_ENTRIES.filter((e) => e.kind === "link");
  assert.equal(links.length, EXTERNAL_TOOLS.length);
});

test("no entry is listed twice", () => {
  const names = SIDEBAR_ENTRIES.map((e) =>
    e.kind === "page" ? e.page.slug : e.link.name,
  );
  assert.equal(new Set(names).size, names.length);
});

test("every tool of this site is somewhere in the sidebar", () => {
  const pages = SIDEBAR_ENTRIES.flatMap((e) =>
    e.kind === "page" ? [e.page.slug] : [],
  );
  assert.deepEqual([...pages].sort(), ["beasts", "leveling", "maps"]);
});

test("the simulation exists and is deliberately not in the sidebar", () => {
  // Unfinished, and a sidebar is a promise that what is in it is not.
  assert.deepEqual([...UNLISTED], ["simulation"]);
  const names = SIDEBAR_ENTRIES.map((e) =>
    e.kind === "page" ? e.page.slug : e.link.name,
  );
  for (const slug of UNLISTED) assert.ok(!names.includes(slug), slug);
});
