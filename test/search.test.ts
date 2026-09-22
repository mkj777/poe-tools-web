import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import { SIDEBAR_ENTRIES, toolBySlug } from "../src/lib/nav.ts";
import {
  GROUP_CAPS,
  SEARCH_INDEX,
  entryHref,
  normalize,
  remember,
  search,
  tokenize,
  type SearchGroupId,
} from "../src/lib/search.ts";

const at = { slug: "allflame", league: "Allflame" };

const find = (query: string, group: SearchGroupId) =>
  search(SEARCH_INDEX, query).find((g) => g.id === group);

const titles = (query: string, group: SearchGroupId = "tools") =>
  find(query, group)?.hits.map((h) => h.entry.title) ?? [];

const reason = (query: string, title: string) =>
  search(SEARCH_INDEX, query)
    .flatMap((g) => g.hits)
    .find((h) => h.entry.title === title)?.reason;

test("the index holds every tool, question and passive, once", () => {
  assert.equal(SEARCH_INDEX.entries.length, 22 + 23 + 21);
  const ids = SEARCH_INDEX.entries.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(SEARCH_INDEX.byId.size, ids.length);
});

test("every question knows the page it is answered on", () => {
  for (const entry of SEARCH_INDEX.entries) {
    if (entry.target.kind !== "faq") continue;
    const page = entry.target.page;
    assert.ok(page === "home" || toolBySlug(page), entry.id);
  }
});

test("every passive wears art that is really in public", () => {
  const files = new Set(readdirSync(new URL("../public/atlas/", import.meta.url)));
  for (const entry of SEARCH_INDEX.entries) {
    if (entry.kind !== "node" || !entry.icon) continue;
    const file = entry.icon.src.replace("/atlas/", "");
    assert.ok(files.has(file), `public${entry.icon.src} is missing`);
  }
});

test("normalize reads text the way a player types it", () => {
  assert.equal(normalize("Poe.Ninja"), "poe ninja");
  assert.equal(normalize("Miner's Strike"), "miners strike");
  assert.equal(normalize("Café  x"), "cafe x");
  assert.equal(normalize("  "), "");
});

test("tokenize drops the words that say nothing, unless they are all there is", () => {
  assert.deepEqual(tokenize("poe regex"), ["regex"]);
  assert.deepEqual(tokenize("poe"), ["poe"]);
  assert.deepEqual(tokenize("How do I price check"), ["price", "check"]);
  assert.deepEqual(tokenize("regex regex"), ["regex"]);
  assert.deepEqual(tokenize(""), []);
});

test("nothing typed is the sidebar again", () => {
  for (const query of ["", "   "]) {
    const groups = search(SEARCH_INDEX, query);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].id, "tools");
    assert.deepEqual(
      groups[0].hits.map((h) => h.entry.title),
      SIDEBAR_ENTRIES.map((e) =>
        e.kind === "page" ? e.page.label : e.link.name,
      ),
    );
    assert.ok(!groups[0].hits.some((h) => h.entry.id === "page:maps"));
  }
});

test("skill tree finds everything that has to do with one", () => {
  for (const query of ["skill tree", "passive tree"]) {
    const found = titles(query);
    assert.deepEqual(
      new Set(found),
      new Set([
        "Path of Building",
        "poe.ninja",
        "Timeless Jewels",
        "Cluster Jewels",
        "PoE Planner",
        "Scarab Nodes",
      ]),
      query,
    );
    assert.equal(found[0], "Path of Building", query);
    assert.equal(found.at(-1), "Scarab Nodes", query);
    assert.equal(reason(query, "Scarab Nodes"), "Atlas tree", query);
    assert.equal(reason(query, "Path of Building"), "Skill tree", query);
    assert.equal(find(query, "nodes"), undefined, query);
  }
});

test("regex is the three regex tools and no badge on any of them", () => {
  // All three carry the word in their name, so they tie, and a tie is read in
  // the sidebar's order.
  assert.deepEqual(titles("regex"), ["PoE Regex", "Beast Regex", "Map Regex"]);
  for (const hit of find("regex", "tools")!.hits) {
    assert.equal(hit.reason, undefined, hit.entry.title);
  }
  assert.ok(titles("regex", "questions").length > 0);
});

test("price is every tool that reads one", () => {
  assert.deepEqual(
    new Set(titles("price")),
    new Set([
      "Trade",
      "Awakened PoE Trade",
      "poe.ninja",
      "Wealthy Exile",
      "PoE Antiquary",
      "Disenchanting",
      "Exilence",
      "Beast Regex",
      "Scarab Nodes",
    ]),
  );
});

test("overlay and lab are the tools that are one", () => {
  assert.deepEqual(
    new Set(titles("overlay")),
    new Set(["Awakened PoE Trade", "Leveling Guide"]),
  );
  assert.deepEqual(titles("lab"), ["PoELab"]);
});

test("leveling is both the overlay and the route", () => {
  const found = titles("leveling");
  assert.ok(found.includes("Leveling Guide"));
  assert.ok(found.includes("Exile Leveling"));
});

test("an abbreviation lands on the tool and says so", () => {
  assert.equal(titles("pob")[0], "Path of Building");
  assert.equal(reason("pob", "Path of Building"), "PoB");
  assert.equal(titles("apt")[0], "Awakened PoE Trade");
  assert.equal(titles("ninja")[0], "poe.ninja");
  assert.equal(titles("poe.ninja")[0], "poe.ninja");
  assert.equal(titles("Path of Building")[0], "Path of Building");
  assert.equal(titles("coe")[0], "Craft of Exile");
  assert.equal(reason("coe", "Craft of Exile"), "CoE");
  assert.equal(titles("exilence")[0], "Exilence");
  assert.equal(titles("poeplanner")[0], "PoE Planner");
});

test("the four newest are found by what they are, not only by name", () => {
  // Each one answers a question its name does not spell.
  assert.equal(titles("wiki")[0], "PoEDB");
  assert.equal(reason("wiki", "PoEDB"), "Wiki");
  assert.ok(titles("mod weights").includes("PoEDB"));
  assert.ok(titles("mod weights").includes("Craft of Exile"));
  assert.ok(titles("crafting simulator").includes("Craft of Exile"));
  assert.ok(titles("net worth").includes("Exilence"));
  assert.ok(titles("net worth").includes("Wealthy Exile"));
  assert.ok(titles("atlas tree").includes("PoE Planner"));
  assert.ok(titles("atlas tree").includes("Scarab Nodes"));
});

test("a page the sidebar does not list is still found by a query", () => {
  assert.equal(titles("map regex")[0], "Map Regex");
  assert.ok(titles("stash").includes("Map Regex"));
});

test("the content a passive touches finds the passive", () => {
  assert.ok(titles("abyss", "nodes").includes("Loved by the Sun"));
  assert.equal(reason("abyss", "Loved by the Sun"), "Abyss");
  assert.ok(titles("heist", "nodes").includes("Straight and Narrow"));
  assert.ok(titles("shrines", "nodes").includes("Devoted Carapaces"));
  const carapaces = titles("carapace", "nodes");
  assert.equal(carapaces.length, GROUP_CAPS.nodes);
  for (const title of carapaces) assert.ok(title.endsWith("Carapaces"), title);
});

test("a question is found by its wording", () => {
  const found = titles("free", "questions");
  assert.ok(found.includes("Are these Path of Exile tools free?"));
  assert.equal(find("free", "tools"), undefined);
});

test("one typo is forgiven, and only where nothing was right", () => {
  assert.equal(titles("scarb")[0], "Scarab Nodes");
  assert.equal(titles("timelss")[0], "Timeless Jewels");
  assert.equal(titles("timles")[0], "Timeless Jewels");
  assert.equal(titles("clsuter")[0], "Cluster Jewels");
  assert.ok(
    !titles("tree", "questions").includes("Are these Path of Exile tools free?"),
  );
});

test("every word has to land somewhere", () => {
  assert.deepEqual(search(SEARCH_INDEX, "beast filter"), []);
  assert.deepEqual(search(SEARCH_INDEX, "xyzzy"), []);
  // Two letters are one edit from any other two, so they are never fuzzy.
  assert.deepEqual(search(SEARCH_INDEX, "sc"), []);
  assert.deepEqual(search(SEARCH_INDEX, "zq"), []);
});

test("no group grows past its cap, and the answer is the same twice", () => {
  const groups = search(SEARCH_INDEX, "scarab");
  for (const group of groups) {
    assert.ok(group.hits.length <= GROUP_CAPS[group.id], group.id);
  }
  assert.deepEqual(groups, search(SEARCH_INDEX, "scarab"));
});

test("a hit goes where the league says", () => {
  const entry = (id: string) => {
    const found = SEARCH_INDEX.byId.get(id);
    if (!found) throw new Error(`No entry ${id}`);
    return found;
  };
  assert.deepEqual(entryHref(entry("page:beasts"), at), {
    href: "/beasts/allflame",
    external: false,
  });
  assert.deepEqual(entryHref(entry("page:leveling"), at), {
    href: "/leveling",
    external: false,
  });
  assert.deepEqual(
    entryHref(entry("link:trade"), { slug: "allflamehc", league: "Hardcore Allflame" }),
    {
      href: "https://www.pathofexile.com/trade/search/Hardcore%20Allflame",
      external: true,
    },
  );
  assert.deepEqual(entryHref(entry("faq:home:0"), at), {
    href: "/#faq-1",
    external: false,
  });
  assert.deepEqual(entryHref(entry("faq:scarabs:4"), at), {
    href: "/scarabs/allflame#faq-5",
    external: false,
  });
  assert.deepEqual(entryHref(entry("node:loved-by-the-sun"), at), {
    href: "/scarabs/allflame#loved-by-the-sun",
    external: false,
  });
});

test("remember keeps the newest first and nothing twice", () => {
  assert.deepEqual(remember([], "a"), ["a"]);
  assert.deepEqual(remember(["a", "b"], "b"), ["b", "a"]);
  assert.deepEqual(remember(["a", "b", "c", "d", "e"], "f"), [
    "f",
    "a",
    "b",
    "c",
    "d",
  ]);
});
