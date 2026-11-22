import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultLeagueSlug,
  leagueParams,
  resolveLeague,
  successorSlug,
} from "../src/lib/league.ts";

/** A response shaped enough like poe.ninja's /leagues answer for every path here. */
function fakeResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  };
}

/**
 * Installs a stub `fetch` for one test and restores the real one after.
 * `getLeagues` is wrapped in React's `cache`, which shares one answer within a
 * server render and does nothing outside one, verified by counting calls
 * below, so each test gets a fresh answer rather than a stale one from a
 * previous test's stub.
 */
function stubFetch(
  t: { after: (fn: () => void) => void },
  handler: () => unknown,
) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => handler()) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
}

const TWO_LEAGUES = [
  { id: "Allflame", name: "Allflame" },
  { id: "Hardcore Allflame", name: "Hardcore Allflame" },
];

test("getLeagues is asked fresh each call outside a render, React's cache only holds within one", async (t) => {
  let calls = 0;
  stubFetch(t, () => {
    calls++;
    return fakeResponse(TWO_LEAGUES);
  });

  await resolveLeague("allflame");
  await resolveLeague("allflame");
  assert.equal(
    calls,
    2,
    "resolveLeague should hit fetch every time, not cache across calls",
  );
});

test("resolveLeague finds the plain league behind its slug", async (t) => {
  stubFetch(t, () => fakeResponse(TWO_LEAGUES));

  const { leagues, league } = await resolveLeague("allflame");
  assert.equal(league, "Allflame");
  assert.deepEqual(leagues, TWO_LEAGUES);
});

test("resolveLeague finds the hardcore league behind its hc-suffixed slug", async (t) => {
  stubFetch(t, () => fakeResponse(TWO_LEAGUES));

  const { league } = await resolveLeague("allflamehc");
  assert.equal(league, "Hardcore Allflame");
});

test("a slug matching no league reports no league, but still hands back the full list", async (t) => {
  stubFetch(t, () => fakeResponse(TWO_LEAGUES));

  const { leagues, league } = await resolveLeague("standard");
  assert.equal(league, undefined);
  assert.deepEqual(leagues, TWO_LEAGUES);
});

test("defaultLeagueSlug is whatever poe.ninja lists first", async (t) => {
  stubFetch(t, () =>
    fakeResponse([
      { id: "Necropolis", name: "Necropolis" },
      { id: "Standard", name: "Standard" },
    ]),
  );

  assert.equal(await defaultLeagueSlug(), "necropolis");
});

test("defaultLeagueSlug falls back to standard when poe.ninja lists nothing", async (t) => {
  stubFetch(t, () => fakeResponse([]));

  assert.equal(await defaultLeagueSlug(), "standard");
});

test("leagueParams is one { league } per league poe.ninja lists", async (t) => {
  stubFetch(t, () => fakeResponse(TWO_LEAGUES));

  assert.deepEqual(await leagueParams(), [
    { league: "allflame" },
    { league: "allflamehc" },
  ]);
});

test("leagueParams on an empty league list is an empty list of params", async (t) => {
  stubFetch(t, () => fakeResponse([]));

  assert.deepEqual(await leagueParams(), []);
});

const COVENS = [
  { id: "Covens" },
  { id: "Hardcore Covens" },
  { id: "Standard" },
  { id: "Hardcore" },
];

test("an ended league is sent to the current one", () => {
  assert.equal(successorSlug("allflame", COVENS), "covens");
  assert.equal(successorSlug("mirage", COVENS), "covens");
});

test("an ended hardcore league is sent to the current hardcore one", () => {
  assert.equal(successorSlug("allflamehc", COVENS), "covenshc");
});

test("a league that is still listed stays where it is", () => {
  for (const slug of ["covens", "covenshc", "standard", "hardcore"]) {
    assert.equal(successorSlug(slug, COVENS), undefined, slug);
  }
});

test("with no leagues to go to, nothing is redirected", () => {
  assert.equal(successorSlug("allflame", []), undefined);
});

test("a hardcore slug with no hardcore league falls back to the first", () => {
  assert.equal(successorSlug("allflamehc", [{ id: "Covens" }]), "covens");
});

test("a capitalised hardcore slug still finds the hardcore league", () => {
  assert.equal(successorSlug("AllflameHC", COVENS), "covenshc");
});
