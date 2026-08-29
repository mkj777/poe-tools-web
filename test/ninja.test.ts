import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllBeastNames,
  getAllScarabs,
  getAstrolabes,
  getBeasts,
  getCurrencyPrices,
  getLeagues,
  getScarabPrices,
  leagueSlug,
  pricesFetchedAt,
} from "../src/lib/ninja.ts";

/**
 * A response shaped enough like the real thing for every code path here: `ok`,
 * `status`, a `date` header, and a `json()` that can also be made to reject,
 * the way a body that is not really JSON would.
 */
function fakeResponse(
  body: unknown,
  {
    ok = true,
    status = 200,
    date,
  }: { ok?: boolean; status?: number; date?: string } = {},
) {
  return {
    ok,
    status,
    headers: {
      get: (name: string) => (name === "date" ? (date ?? null) : null),
    },
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

/** Installs a stub `fetch` for one test and restores the real one after. */
function stubFetch(
  t: { after: (fn: () => void) => void },
  handler: (url: string) => unknown,
) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url);
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
}

test("leagueSlug drops everything but letters and digits", () => {
  assert.equal(leagueSlug("Allflame"), "allflame");
  assert.equal(leagueSlug("SSF Allflame"), "ssfallflame");
});

test("leagueSlug turns a hardcore league into an hc suffix", () => {
  assert.equal(leagueSlug("Hardcore Allflame"), "allflamehc");
  assert.equal(leagueSlug("HARDCORE Allflame"), "allflamehc");
});

test("plain Hardcore stays hardcore, it does not become an empty base plus hc", () => {
  assert.equal(leagueSlug("Hardcore"), "hardcore");
});

test("hardcore only counts as the prefix when a word break follows it", () => {
  // No space after "Hardcore", so this is one word, not the hardcore variant
  // of something called "valley".
  assert.equal(leagueSlug("Hardcorevalley"), "hardcorevalley");
});

test("getLeagues asks poe.ninja for /leagues with the site's user agent", async (t) => {
  let seenUrl = "";
  let seenUA = "";
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = input.toString();
    seenUA =
      (init?.headers as Record<string, string> | undefined)?.["User-Agent"] ??
      "";
    return fakeResponse([{ id: "Allflame", name: "Allflame" }]);
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });

  const leagues = await getLeagues();
  assert.equal(seenUrl, "https://poe.ninja/poe1/api/economy/leagues");
  assert.match(seenUA, /poe-tools-web/);
  assert.deepEqual(leagues, [{ id: "Allflame", name: "Allflame" }]);
});

test("a non-ok status from poe.ninja becomes a thrown error naming the path and status", async (t) => {
  stubFetch(t, () => fakeResponse(null, { ok: false, status: 503 }));
  await assert.rejects(getLeagues(), /poe\.ninja \/leagues -> 503/);
});

test("a body that is not really JSON rejects rather than returning garbage", async (t) => {
  stubFetch(t, () => fakeResponse(new SyntaxError("Unexpected token")));
  await assert.rejects(getLeagues(), SyntaxError);
});

test("an empty leagues list is a valid answer, not an error", async (t) => {
  stubFetch(t, () => fakeResponse([]));
  assert.deepEqual(await getLeagues(), []);
});

test("getBeasts asks for the Beast overview of the league it was given", async (t) => {
  let seenUrl = "";
  stubFetch(t, (url) => {
    seenUrl = url;
    return fakeResponse({ lines: [{ id: 1, name: "Craicic Croaker" }] });
  });

  const beasts = await getBeasts("Allflame");
  assert.equal(
    seenUrl,
    "https://poe.ninja/poe1/api/economy/stash/current/item/overview?league=Allflame&type=Beast",
  );
  assert.deepEqual(beasts, [{ id: 1, name: "Craicic Croaker" }]);
});

test("getBeasts encodes a league name that needs it", async (t) => {
  let seenUrl = "";
  stubFetch(t, (url) => {
    seenUrl = url;
    return fakeResponse({ lines: [] });
  });

  await getBeasts("Hardcore Allflame");
  assert.ok(seenUrl.includes("league=Hardcore%20Allflame"), seenUrl);
});

test("an empty Beast overview is 0 beasts, not a failure", async (t) => {
  stubFetch(t, () => fakeResponse({ lines: [] }));
  assert.deepEqual(await getBeasts("Standard"), []);
});

test("pricesFetchedAt reads the Date header poe.ninja answered with", async (t) => {
  stubFetch(t, () =>
    fakeResponse({}, { date: "Wed, 01 Jan 2025 00:00:00 GMT" }),
  );
  const at = await pricesFetchedAt("Standard");
  assert.equal(at, Date.parse("Wed, 01 Jan 2025 00:00:00 GMT"));
});

test("pricesFetchedAt falls back to now when there is no usable Date header", async (t) => {
  stubFetch(t, () => fakeResponse({}));
  const before = Date.now();
  const at = await pricesFetchedAt("Standard");
  const after = Date.now();
  assert.ok(
    at >= before && at <= after,
    `${at} not between ${before} and ${after}`,
  );
});

test("getAllScarabs is empty when the exchange is not quoting in chaos", async (t) => {
  stubFetch(t, () =>
    fakeResponse({ lines: [], items: [], core: { primary: "divine" } }),
  );
  assert.deepEqual(await getAllScarabs("Standard"), []);
});

test("getAllScarabs drops a line with no matching item and one priced at zero", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "chaos" },
      items: [{ id: "known", name: "Known Scarab", image: "/known.png" }],
      lines: [
        { id: "known", primaryValue: 5 },
        { id: "unknown", primaryValue: 5 },
        { id: "known-zero", primaryValue: 0 },
      ],
    }),
  );
  const scarabs = await getAllScarabs("Standard");
  assert.deepEqual(scarabs, [
    {
      id: "known",
      name: "Known Scarab",
      icon: "https://web.poecdn.com/known.png",
      chaosValue: 5,
    },
  ]);
});

test("getAllScarabs sorts what is left by name", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "chaos" },
      items: [
        { id: "z", name: "Zeta Scarab", image: "/z.png" },
        { id: "a", name: "Alpha Scarab", image: "/a.png" },
      ],
      lines: [
        { id: "z", primaryValue: 1 },
        { id: "a", primaryValue: 1 },
      ],
    }),
  );
  const names = (await getAllScarabs("Standard")).map((s) => s.name);
  assert.deepEqual(names, ["Alpha Scarab", "Zeta Scarab"]);
});

test("getAllScarabs survives a response missing items or lines outright, not just empty ones", async (t) => {
  // Defends against a malformed body rather than a merely empty one: no
  // `items` or `lines` key at all, not `[]`.
  stubFetch(t, () => fakeResponse({ core: { primary: "chaos" } }));
  assert.deepEqual(await getAllScarabs("Standard"), []);
});

test("getAstrolabes is the same request shape with a different type", async (t) => {
  let seenUrl = "";
  stubFetch(t, (url) => {
    seenUrl = url;
    return fakeResponse({ lines: [], items: [], core: { primary: "chaos" } });
  });
  await getAstrolabes("Standard");
  assert.ok(seenUrl.includes("type=Astrolabe"), seenUrl);
});

test("getScarabPrices only returns the three run scarabs that priced", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "chaos" },
      lines: [
        { id: "bestiary-scarab-of-duplicating", primaryValue: 3 },
        { id: "some-other-scarab", primaryValue: 99 },
      ],
    }),
  );
  const prices = await getScarabPrices("Standard");
  assert.equal(prices.length, 1);
  assert.equal(prices[0].id, "bestiary-scarab-of-duplicating");
  assert.equal(prices[0].chaosValue, 3);
  assert.equal(prices[0].run, 20);
});

test("getScarabPrices is empty when the exchange quotes in something other than chaos, even with matching ids priced", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "divine" },
      lines: [{ id: "bestiary-scarab-of-duplicating", primaryValue: 3 }],
    }),
  );
  assert.deepEqual(await getScarabPrices("Standard"), []);
});

test("getCurrencyPrices reads the divine and mirror rates out of one overview", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "chaos" },
      lines: [
        { id: "divine", primaryValue: 180 },
        { id: "mirror", primaryValue: 320000 },
      ],
    }),
  );
  assert.deepEqual(await getCurrencyPrices("Standard"), {
    divine: 180,
    mirror: 320000,
  });
});

test("getCurrencyPrices leaves out a rate the overview did not carry", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "chaos" },
      lines: [{ id: "divine", primaryValue: 180 }],
    }),
  );
  assert.deepEqual(await getCurrencyPrices("Standard"), {
    divine: 180,
    mirror: undefined,
  });
});

test("getCurrencyPrices is empty when the exchange is not quoting in chaos", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      core: { primary: "divine" },
      lines: [{ id: "divine", primaryValue: 180 }],
    }),
  );
  assert.deepEqual(await getCurrencyPrices("Standard"), {});
});

test("getAllBeastNames reads the Itemised Monsters group off the trade site", async (t) => {
  stubFetch(t, () =>
    fakeResponse({
      result: [
        { label: "Currency", entries: [{ name: "Chaos Orb" }] },
        {
          label: "Itemised Monsters",
          entries: [{ name: "Craicic Croaker" }, { type: "Farric Ape" }, {}],
        },
      ],
    }),
  );
  assert.deepEqual(await getAllBeastNames(), ["Craicic Croaker", "Farric Ape"]);
});

test("getAllBeastNames is empty when the trade site has no such group", async (t) => {
  stubFetch(t, () => fakeResponse({ result: [] }));
  assert.deepEqual(await getAllBeastNames(), []);
});

test("a non-ok status from the trade site is a thrown error naming the status", async (t) => {
  stubFetch(t, () => fakeResponse(null, { ok: false, status: 429 }));
  await assert.rejects(getAllBeastNames(), /trade\/data\/items -> 429/);
});
