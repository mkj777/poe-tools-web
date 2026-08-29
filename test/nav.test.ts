import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME,
  SITE_TOOLS,
  activePage,
  activeTool,
  leagueFromPath,
  pageHref,
  swapLeague,
  toolBySlug,
  toolHref,
} from "../src/lib/nav.ts";

const beasts = toolBySlug("beasts")!;
const maps = toolBySlug("maps")!;
const leveling = toolBySlug("leveling")!;

test("the sidebar lists the tools this site hosts", () => {
  assert.deepEqual(
    SITE_TOOLS.map((t) => t.slug),
    ["beasts", "maps", "leveling"],
  );
  assert.equal(HOME.slug, "beasts");
});

test("every tool says what it is, briefly", () => {
  for (const tool of SITE_TOOLS) {
    assert.ok(tool.label.length > 0, tool.slug);
    assert.ok(tool.blurb.length > 0, tool.slug);
    // Two lines in a 16rem column: anything longer is cut off mid word.
    assert.ok(tool.blurb.length <= 28, `${tool.slug}: ${tool.blurb}`);
    assert.ok(!tool.blurb.endsWith("."), tool.slug);
    for (const page of tool.pages ?? []) {
      assert.ok(page.blurb.length > 0 && page.blurb.length <= 28, page.slug);
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

test("a page of a tool hangs under it", () => {
  const sim = beasts.pages![0];
  assert.equal(pageHref(beasts, sim, "allflame"), "/beasts/allflame/simulation");
});

test("activeTool reads the tool out of a pathname", () => {
  assert.equal(activeTool("/beasts/allflame"), "beasts");
  assert.equal(activeTool("/beasts"), "beasts");
  assert.equal(activeTool("/maps/allflamehc"), "maps");
  assert.equal(activeTool("/leveling"), "leveling");
  assert.equal(activeTool("/leveling/"), "leveling");
});

test("a path that is no tool of ours lights nothing up", () => {
  // The old league-first URLs, on their way to the tool they have become.
  assert.equal(activeTool("/allflame"), "");
  assert.equal(activeTool("/"), "");
  assert.equal(activeTool(""), "");
  assert.equal(activeTool("/whatever/else"), "");
});

test("activePage tells a tool's page from the tool itself", () => {
  assert.equal(activePage("/beasts/allflame/simulation"), "simulation");
  assert.equal(activePage("/beasts/allflame"), "");
  assert.equal(activePage("/beasts"), "");
  assert.equal(activePage("/beasts/allflame/nonsense"), "");
  assert.equal(activePage("/leveling"), "");
  assert.equal(activePage("/allflame"), "");
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
