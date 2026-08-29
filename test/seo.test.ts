import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEASTS_FAQ,
  HOME_FAQ,
  LEVELING_FAQ,
  MAPS_FAQ,
} from "../src/lib/faq.ts";
import {
  ANSWER_ENGINES,
  breadcrumbLd,
  downloadLd,
  faqLd,
  llmsTxt,
  robotsRules,
  sitemapEntries,
  toolListLd,
  webAppLd,
  websiteLd,
} from "../src/lib/seo.ts";
import { SITE_URL, canonical } from "../src/lib/site.ts";
import { SITE_TOOLS } from "../src/lib/nav.ts";
import { EXTERNAL_TOOLS } from "../src/lib/tools.ts";

const LEAGUES = ["allflame", "allflamehc", "standard"];

/* -------------------------------------------------------------------------- */
/* canonical                                                                   */
/* -------------------------------------------------------------------------- */

test("a canonical URL is absolute, which is the only kind that means anything", () => {
  assert.equal(canonical("/"), SITE_URL);
  assert.equal(canonical("/beasts/allflame"), `${SITE_URL}/beasts/allflame`);
  assert.ok(canonical("/leveling").startsWith("http"));
});

test("a canonical URL is the same URL however it was asked for", () => {
  // Two spellings of one page are two pages to a crawler, so neither the
  // missing slash at the front nor the extra one at the back survives.
  assert.equal(canonical("leveling"), canonical("/leveling"));
  assert.equal(canonical("/leveling/"), canonical("/leveling"));
  assert.equal(canonical(), SITE_URL);
});

test("the origin carries no trailing slash of its own", () => {
  assert.ok(!SITE_URL.endsWith("/"));
  assert.doesNotThrow(() => new URL(SITE_URL));
});

/* -------------------------------------------------------------------------- */
/* sitemap                                                                     */
/* -------------------------------------------------------------------------- */

test("the sitemap lists the home page, the overlay and every league page", () => {
  const urls = sitemapEntries(LEAGUES).map((e) => e.url);
  assert.ok(urls.includes(canonical("/")));
  assert.ok(urls.includes(canonical("/leveling")));
  for (const league of LEAGUES) {
    assert.ok(urls.includes(canonical(`/beasts/${league}`)), league);
    assert.ok(urls.includes(canonical(`/maps/${league}`)), league);
  }
  assert.equal(urls.length, 2 + LEAGUES.length * 2);
});

test("the sitemap names no URL twice", () => {
  const urls = sitemapEntries(LEAGUES).map((e) => e.url);
  assert.equal(new Set(urls).size, urls.length);
});

test("the sitemap holds no path that only redirects", () => {
  // /beasts and /maps answer with a 307 to a league. Listing them would spend
  // a crawl to be told what the next line already says.
  const urls = sitemapEntries(LEAGUES).map((e) => e.url);
  assert.ok(!urls.includes(canonical("/beasts")));
  assert.ok(!urls.includes(canonical("/maps")));
});

test("the league everybody is playing outranks the ones they are not", () => {
  const entries = sitemapEntries(LEAGUES);
  const at = (path: string) => entries.find((e) => e.url === canonical(path))!;

  assert.equal(at("/").priority, 1);
  assert.ok(at("/beasts/allflame").priority > at("/beasts/standard").priority);
  assert.ok(at("/maps/allflame").priority > at("/maps/standard").priority);
  for (const entry of entries) {
    assert.ok(entry.priority > 0 && entry.priority <= 1, entry.url);
  }
});

test("prices change daily and the overlay does not, and the sitemap says so", () => {
  const entries = sitemapEntries(LEAGUES);
  const at = (path: string) => entries.find((e) => e.url === canonical(path))!;
  assert.equal(at("/beasts/allflame").changeFrequency, "daily");
  assert.equal(at("/leveling").changeFrequency, "monthly");
});

test("a poe.ninja that is down costs the league pages, not the sitemap", () => {
  const urls = sitemapEntries([]).map((e) => e.url);
  assert.deepEqual(urls, [canonical("/"), canonical("/leveling")]);
});

test("every entry is stamped with one moment, so the file is stable", () => {
  const now = new Date("2026-08-30T10:00:00.000Z");
  for (const entry of sitemapEntries(LEAGUES, now)) {
    assert.equal(entry.lastModified.toISOString(), now.toISOString());
  }
});

/* -------------------------------------------------------------------------- */
/* robots                                                                      */
/* -------------------------------------------------------------------------- */

test("everything is crawlable except the cron endpoint", () => {
  const [wildcard] = robotsRules();
  assert.equal(wildcard.userAgent, "*");
  assert.equal(wildcard.allow, "/");
  assert.deepEqual(wildcard.disallow, ["/api/"]);
});

test("the engines that answer instead of listing are welcomed by name", () => {
  const rule = robotsRules().find((r) => Array.isArray(r.userAgent));
  assert.ok(rule, "no rule for the answer engines");
  assert.equal(rule.allow, "/");
  // These two are the switches, not crawlers: unmentioned they can default to
  // off, and off means being left out of an AI Overview.
  assert.ok(ANSWER_ENGINES.includes("Google-Extended"));
  assert.ok(ANSWER_ENGINES.includes("GPTBot"));
  assert.equal(new Set(ANSWER_ENGINES).size, ANSWER_ENGINES.length);
});

test("nothing readable is disallowed", () => {
  for (const rule of robotsRules()) {
    const disallow = [rule.disallow ?? []].flat();
    for (const path of disallow) assert.match(path, /^\/api\//);
  }
});

/* -------------------------------------------------------------------------- */
/* llms.txt                                                                    */
/* -------------------------------------------------------------------------- */

test("llms.txt opens with the name of the site and one line saying what it is", () => {
  const lines = llmsTxt().split("\n");
  assert.equal(lines[0], "# Path of Tools");
  assert.ok(lines[2].startsWith("> "));
});

test("llms.txt lists every tool, wherever it lives", () => {
  const text = llmsTxt();
  for (const tool of SITE_TOOLS)
    assert.ok(text.includes(tool.label), tool.slug);
  for (const tool of EXTERNAL_TOOLS)
    assert.ok(text.includes(tool.name), tool.name);
  for (const tool of EXTERNAL_TOOLS) {
    assert.ok(text.includes(tool.href("Standard")), tool.name);
  }
});

test("llms.txt carries the one thing this site knows that no other page does", () => {
  // The in game testing in docs/, which is the whole reason to quote us.
  const text = llmsTxt();
  assert.ok(text.includes("249 characters"));
  assert.ok(text.toLowerCase().includes("stash search"));
});

/* -------------------------------------------------------------------------- */
/* structured data                                                             */
/* -------------------------------------------------------------------------- */

const ld = (data: Record<string, unknown>) => JSON.parse(JSON.stringify(data));

test("every block of structured data survives being serialised", () => {
  const blocks = [
    websiteLd(),
    toolListLd(),
    faqLd(HOME_FAQ),
    breadcrumbLd([{ name: "Home", path: "/" }]),
    webAppLd({ name: "n", path: "/maps/standard", description: "d" }),
    downloadLd({
      name: "n",
      path: "/leveling",
      description: "d",
      downloadUrl: "https://example.com/a.exe",
    }),
  ];
  for (const block of blocks) {
    assert.equal(ld(block)["@context"], "https://schema.org");
    // A lone `<` would close the script tag it is printed into. The component
    // escapes it, but nothing here should be producing one to escape.
    assert.ok(!JSON.stringify(block).includes("</"));
  }
});

test("the site names itself once and everything else points at that", () => {
  const graph = ld(websiteLd())["@graph"];
  const org = graph.find(
    (n: { "@type": string }) => n["@type"] === "Organization",
  );
  const site = graph.find((n: { "@type": string }) => n["@type"] === "WebSite");
  assert.equal(org.name, "Path of Tools");
  assert.equal(site.url, SITE_URL);
  assert.equal(site.publisher["@id"], org["@id"]);
});

test("the directory lists every tool the site has, once, in order", () => {
  const list = ld(toolListLd());
  const items = list.itemListElement;
  assert.equal(list.numberOfItems, SITE_TOOLS.length + EXTERNAL_TOOLS.length);
  assert.equal(items.length, list.numberOfItems);
  items.forEach((item: { position: number; url: string }, i: number) => {
    assert.equal(item.position, i + 1);
    assert.match(item.url, /^https?:\/\//);
  });
  const names = items.map((i: { name: string }) => i.name);
  assert.equal(new Set(names).size, names.length);
});

test("a breadcrumb counts from one and points at absolute pages", () => {
  const trail = ld(
    breadcrumbLd([
      { name: "Path of Exile tools", path: "/" },
      { name: "Bestiary prices", path: "/beasts/allflame" },
    ]),
  ).itemListElement;
  assert.deepEqual(
    trail.map((s: { position: number }) => s.position),
    [1, 2],
  );
  assert.equal(trail[1].item, canonical("/beasts/allflame"));
});

test("a question in the markup is the same question as on the page", () => {
  const marked = ld(faqLd(BEASTS_FAQ)).mainEntity;
  assert.equal(marked.length, BEASTS_FAQ.length);
  marked.forEach((entry: Record<string, never>, i: number) => {
    assert.equal(entry.name, BEASTS_FAQ[i].question);
    assert.equal(
      (entry.acceptedAnswer as unknown as { text: string }).text,
      BEASTS_FAQ[i].answer,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* the copy itself                                                             */
/* -------------------------------------------------------------------------- */

const ALL_FAQ = [...HOME_FAQ, ...BEASTS_FAQ, ...MAPS_FAQ, ...LEVELING_FAQ];

test("every question is a question, and no two are the same", () => {
  for (const faq of ALL_FAQ) {
    assert.ok(faq.question.endsWith("?"), faq.question);
    assert.ok(faq.question.length <= 70, faq.question);
  }
  const questions = ALL_FAQ.map((f) => f.question);
  assert.equal(new Set(questions).size, questions.length);
});

test("every answer is the length an engine will quote whole", () => {
  // Roughly forty to sixty words. Shorter says nothing, longer gets cut, and a
  // cut answer is the version that ends up in somebody else's summary.
  for (const faq of ALL_FAQ) {
    const words = faq.answer.split(/\s+/).length;
    assert.ok(words >= 30, `${faq.question}: ${words} words`);
    assert.ok(words <= 70, `${faq.question}: ${words} words`);
    assert.ok(faq.answer.endsWith("."), faq.question);
  }
});

test("every tool says more about itself than four words", () => {
  for (const tool of [...SITE_TOOLS, ...EXTERNAL_TOOLS]) {
    const name = "name" in tool ? tool.name : tool.label;
    assert.ok(tool.about.length >= 100, `${name}: ${tool.about.length} chars`);
    assert.ok(tool.about.length <= 260, `${name}: ${tool.about.length} chars`);
    assert.ok(tool.about.endsWith("."), name);
    assert.notEqual(tool.about, tool.blurb);
  }
});

test("no copy on this site carries an em dash", () => {
  // A rule of the project, and the one kind of typo a language model reaches
  // for by itself. Cheap to check on the files that are nothing but prose.
  for (const file of ["site.ts", "faq.ts", "seo.ts", "tools.ts", "nav.ts"]) {
    const source = readFileSync(
      new URL(`../src/lib/${file}`, import.meta.url),
      "utf8",
    );
    assert.ok(!source.includes("—"), `src/lib/${file} has an em dash`);
  }
});
