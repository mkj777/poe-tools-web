# Wealth tracker — design

**Date:** 2026-08-18 (revised 2026-08-20)
**Status:** approved design, not yet implemented
**Scope:** turn the beast price browser into a multi-tool site and add the first
new tool, Wealth: paste a Path of Exile session cookie, sync the stash tabs you
choose, and watch what they are worth over time.

## Why

The site already knows how to price Path of Exile 1 items and already talks to
poe.ninja on a schedule. Everything it shows is the same for every visitor.
Wealth is the first feature that belongs to one person: their stash, their
numbers, their history. That means a navigation shell, a datastore, and a
rate-limited path to Grinding Gear Games' own API — none of which the project
has today.

## Decisions

| Question | Decision |
| --- | --- |
| Site accounts | None. No sign-up, no sign-in, no email, no password |
| Stash access | POESESSID, kept in the visitor's browser, sent per request |
| Where the cookie lives | `localStorage` on the visitor's machine. Never on the server |
| Datastore | Postgres on Supabase, reached with Drizzle. TypeScript only |
| Snapshot shape | One row per sync, the priced items as a JSON column |
| Who may read a history | Only a browser holding a signed access token |
| Routing | `/[league]` stays beasts, Wealth at `/[league]/wealth` |
| Sync | One tab per request, driven by the browser |
| Valuation | Everything poe.ninja publishes a price for |
| Chart | Hand-drawn SVG, no charting dependency |
| Navigation | One top bar: mark and tool tabs left, league select right |

### Why the cookie has to touch the server

A browser cannot call pathofexile.com directly: GGG sends no CORS headers and a
third-party cookie would not be attached anyway. Every stash read therefore goes
through a route handler here. The design does not pretend otherwise, it bounds
it: the cookie arrives in the request body, lives in the function's memory for
that one call, is never written to any column, never logged, and never returned
in a response.

One thing improves by moving it to the server. GGG's stash limits are counted
per IP, and the calls now leave from Vercel's addresses rather than the
visitor's, so a sync can no longer lock the game client on their own machine —
which is exactly what local scripting did.

## Out of scope

- **Share links.** A later opt-in: a token in the URL that makes one history
  readable to anyone holding the link, for streaming or guild comparison. The
  schema leaves room; nothing is public by default.
- Hourly/Total and Divines/Percentage toggles, the Sell button, premium tiers.
- Rare gear valuation. poe.ninja has no price for a rare, and searching the
  trade API per item is what earns an IP lockout.
- Official GGG OAuth. If GGG ever grants a client it becomes a second way to
  authorise a sync and changes nothing else.

## Rate limits, measured rather than guessed

`character-window/get-stash-items` answers with

```
x-rate-limit-ip: 45:60:60,200:120:900
```

read as *45 requests per 60 seconds, 60 second ban*, and *200 per 120 seconds,
900 second ban*. GGG documents `X-Rate-Limit-{rule}` as `hits:period:penalty`,
`X-Rate-Limit-{rule}-State` as the same triple for the current window, and
`Retry-After` in seconds on a 429. It also states limits are dynamic, and that
too many 4xx responses in a short window restrict access on their own.

Three consequences drive the design:

1. **The IP budget is shared by every visitor.** 45 per minute is not 45 per
   person; it is 45 for the whole deployment. Nothing may pace itself locally.
2. **The budget must be claimed before the call, from shared storage.** Each
   function instance is its own process, so the only shared truth is a row in
   Postgres.
3. **A bad cookie must not be retried.** Two consecutive 4xx for an account stop
   that account for an hour, because the 4xx threshold is its own way to lose
   access.

The limiter therefore keeps a rolling counter and claims a slot inside a
transaction before every GGG call, against self-imposed caps of **30 per 60
seconds** and **120 per 120 seconds** — two thirds of the real numbers, so a
miscount cannot reach the penalty. No slot means the caller is told how long to
wait; nothing sleeps inside a function. Observed `-State` headers tighten the
caps at runtime if GGG lowers them, and a 429 writes a hard cooldown for
`Retry-After` seconds that blocks every account until it passes.

## Architecture

### Routes

| Path | Rendering | Notes |
| --- | --- | --- |
| `/` | redirect | unchanged |
| `/[league]` | static, `revalidate = 900` | beasts, unchanged — no URL breaks |
| `/[league]/wealth` | `force-dynamic` | reads the access token, renders that history |
| `POST /api/wealth/session` | dynamic | verify a POESESSID, issue the access token, return the tab list |
| `POST /api/wealth/sync/start` | dynamic | open a draft snapshot, answer with the tabs to walk |
| `POST /api/wealth/sync/tab` | dynamic | fetch and price exactly one tab |
| `POST /api/wealth/sync/finish` | dynamic | total, breakdown, prune, close the draft |
| `PUT /api/wealth/tabs` | dynamic | which tabs count |
| `POST /api/wealth/forget` | dynamic | delete every row for this account, clear the token |

Every route except the beasts pages requires the access cookie; `session` is the
one that mints it.

A new `src/app/[league]/layout.tsx` renders the navigation bar, so both tools
share it and the beasts page keeps its own prerendering.

### Navigation

`src/components/site-nav.tsx`, a client component. Mark and tool tabs on the
left, the existing `LeagueSelect` on the right. Switching league keeps the
current tool: it reads `usePathname` and swaps only the first segment. The
beasts page gives up its gutter copy of the league select and the simulation
link, which move into the bar; the large logo and the scarab cards stay.

### Identity without accounts

There is no user table and nothing to sign up for. A history is keyed by the
Path of Exile account name, and the right to read it is proved by holding a live
session cookie for that account:

1. The visitor pastes a POESESSID. It is stored under `wealth.poesessid` in
   `localStorage` and stays there, so syncing later costs no second paste. The
   form says plainly that anything able to run script on this domain could read
   it.
2. `POST /api/wealth/session` sends it once. The server calls GGG's
   `/api/profile`, which both names the account and proves the cookie is live.
3. The response sets `wealth_access`: an HMAC-signed, httpOnly, `secure`,
   `sameSite=lax` cookie carrying the account name and an expiry thirty days
   out, signed with `WEALTH_TOKEN_SECRET`. Nothing about it is stored server
   side; the signature is the whole check.
4. Reads require that cookie. Knowing an account name is not enough — without a
   valid signature the answer is 404, which closes the enumeration hole that
   would otherwise make the database a searchable list of who is rich.

A new machine repeats step 1 and lands on the same history. `POST
/api/wealth/forget` deletes every row for the account and clears both the cookie
and `localStorage`.

### Schema

Drizzle owns the schema in TypeScript; `drizzle-kit` generates the migrations.
There is no hand-written SQL, no database function, and no ORM-free query. The
connection string is a server secret and no key of any kind reaches the browser,
so there is no anonymous surface for row-level security to defend.

```ts
stashAccounts   accountName  text primary key
                firstSeen, lastSyncAt, lastError, badAuthAt

tabSelections   accountName + league + tabId  composite primary key
                tabIndex, name, colour, type, selected

snapshots       id serial, accountName, league, takenAt
                status: 'draft' | 'done'
                totalChaos, unpricedCount, divineRate
                breakdown jsonb   -- [{ category, chaos, count }]
                items     jsonb   -- [{ name, category, tabId, stack, chaosEach }]
                index (accountName, league, takenAt desc)

gggBudget       scope text primary key, windowStart, hits, blockedUntil
```

**Why the items are one JSON column.** A stash of 2000 priced items is roughly
120 KB of raw JSON; Postgres compresses a `jsonb` column of that size out of
line, which lands near 25 KB. Two hundred snapshots is then about 5 MB for one
person, and the free tier's 500 MB holds on the order of a hundred people. That
is far more headroom than a row-per-item table, which would be 400 000 rows for
the same person. The chart and the breakdown never read the blob at all — they
select `takenAt`, `totalChaos` and `breakdown`, and Postgres leaves the
out-of-line column on disk untouched.

Snapshots older than 60 days, or beyond 300 per account and league, are deleted
at the end of a sync. Only the newest 30 keep their `items`; older ones are
stripped to their totals and breakdown, which is all the chart ever wanted.

### Sync, one tab per request

A whole sync in one function call was the wrong shape: Hobby's ceiling is 60
seconds, waiting out a rate-limit window can cost more than that on its own, and
a timeout halfway through would have thrown away everything fetched so far.

The browser drives instead:

1. `sync/start` opens a `draft` snapshot and answers with the selected tab ids.
2. For each tab, `sync/tab` claims a rate-limit slot, fetches that one tab,
   prices it, and appends to the draft. One GGG call per request, about two
   seconds each. If no slot is free, it answers `429` with the seconds to wait
   and the browser waits exactly that long.
3. `sync/finish` totals the draft, writes the breakdown, marks it `done` and
   prunes.

The progress bar is free, the sync survives a closed tab (the draft is resumed
or discarded on the next start), and no single request can time out. A draft
older than an hour is discarded.

The first ever sync stops after the tab list and shows the picker, because new
tabs default to unselected and a silent zero-tab sync would look broken. At most
25 tabs may be selected — that is one minute of budget at the self-imposed cap,
and the picker refuses the twenty-sixth.

If GGG rejects the cookie, `badAuthAt` is stamped, the page asks for a fresh
paste, and nothing retries until an hour has passed.

### Valuation

`src/lib/wealth/price.ts` builds one lookup per league from poe.ninja, cached on
the same 900-second window the rest of the site uses and shared by every
visitor, so a sync costs no poe.ninja request of its own.

Two response shapes, both confirmed against the live API:

- **Currency and Fragment** come from `currency/overview`: the key is
  `currencyTypeName`, the price is `receive.value` in chaos.
- **Everything else** comes from `item/overview`, whose lines carry `name`,
  `baseType`, `links`, `gemLevel`, `gemQuality`, `corrupted`, `variant` and
  `chaosValue`.

Matched by name alone: Currency, Fragment, Scarab, Essence, DivinationCard, Oil,
Fossil, Resonator, DeliriumOrb, Omen, Tattoo, Incubator, Artifact, Allflame,
Vial, Invitation, Beast. Chaos Orb is pinned at 1.

Matched with variants, because poe.ninja prices these per variant:

- **Unique weapons, armour, accessories, flasks and jewels** — name plus link
  count (5L and 6L are separate lines) plus corrupted.
- **Skill gems** — name, `gemLevel`, `gemQuality`, `corrupted`. The overview
  carries 7518 lines, so the lookup is a map keyed on that tuple, not a scan.
- **Maps** — base name, tier, blighted or blight-ravaged, unique maps by name.
- **Cluster jewels** — base type, passive count and the enchantment text, which
  is what poe.ninja puts in `name`.

An item's fallback key is `typeLine`, then `baseType`; quantity is `stackSize`
or one. Anything unmatched is categorised `Unpriced`, counted, and shown as its
own line rather than guessed at — the count is stored on the snapshot so the
chart never implies a total it did not have.

The divine rate is stored per snapshot, so an old point keeps the rate it was
taken at instead of being rewritten by today's exchange.

Name matching ships first and stands on its own; the variant matchers land after
it, each with its own tests.

### Interface

Without an access cookie, `/[league]/wealth` is the paste card: what the tool
does, the input, a plain warning about what a session cookie grants and that
logging out of pathofexile.com revokes it, and a Sync button.

With one, the page is:

- the total in chaos and divines, with the change across the selected range;
- the chart — total chaos over time, 24 hours / 7 days / 30 days, drawn as a
  plain SVG polyline from `takenAt` and `totalChaos`. One line, no dependency;
- a Breakdown card straight from the stored `breakdown`;
- a sidebar listing the tabs with checkboxes;
- a table of items — name, tab, quantity, unit price, total — sorted by value,
  with a search box and a row cap, the same pattern the beast table already
  uses. No virtualisation library;
- a Forget button that deletes everything.

The Sync button shows how long ago the last sync ran and, during a sync, which
tab is being fetched. A single sync leaves one point, and the chart says so
rather than drawing a flat line pretending to be history.

## Performance

- Price lookups are per league, not per visitor, and live in the existing ISR
  cache. A sync makes zero poe.ninja requests.
- The chart and breakdown read narrow columns; the item JSON stays out of line
  and off the wire.
- Sync cost is bounded by the limiter, not by the code: one GGG call per
  request, at most 25 per sync.
- Nothing blocks inside a function. The only waiting happens in the browser,
  where it can be shown.

## Testing

`node --test`, the harness already in the repo. No test touches GGG or Postgres
over the network.

- Access token: sign, verify, reject a tampered payload, reject an expired one.
- Rate-limit header parsing: both rules in one header, near-limit state, 429
  with `Retry-After`.
- Budget claiming: refuses past the cap, releases as the window rolls, one
  claim per call under concurrent attempts.
- Pricing: stacks, the pinned Chaos Orb, 6-link uniques, corrupted gems, map
  tiers, cluster jewels, unpriced items, unknown categories.
- The tab mapper against a checked-in, sanitised `get-stash-items` fixture.
- Draft lifecycle: start, append, finish, resume, discard when stale.
- Chart series building: range filtering, gaps, a single point.
- A guard test that no source file sends a POESESSID anywhere but
  pathofexile.com, and that no schema column holds one.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres, transaction pooler, server only |
| `WEALTH_TOKEN_SECRET` | HMAC secret for the access cookie |

New dependencies: `drizzle-orm` and `postgres`, plus `drizzle-kit` for
development. No Supabase client, no charting library, no virtualisation library,
no authentication library. `node:crypto` covers the signing.

Content-Security-Policy allows images from `web.poecdn.com`, which is where both
poe.ninja and the stash API point their icons, and nothing else third-party
runs: no analytics, no CDN scripts, no remote fonts beyond the ones `next/font`
already self-hosts.

## Risks

- **Shared IP budget.** 45 requests a minute for the entire site. The limiter is
  the whole mitigation, and at a few dozen simultaneous syncs the honest answer
  is a queue with one worker, not a bigger cap.
- **POESESSID in `localStorage`.** Readable by anything that can run script on
  this domain. The mitigation is that nothing third-party runs here, plus a
  strict CSP and no `dangerouslySetInnerHTML` on anything derived from stash
  data.
- **The server sees the cookie in transit.** Bounded, not eliminated. The guard
  test and code review keep it bounded.
- **Cookies expire.** GGG invalidates a POESESSID on logout and on some IP
  changes. The failure is visible, asks for a new paste, and does not retry.
- **Account renames** orphan a history, since the name is the key. Rare, and the
  fix is to sync again under the new name.
- **Terms of service.** GGG is not fond of third-party sites collecting other
  people's session cookies. Worth raising in the existing mail thread before
  this is advertised anywhere.

## Build order

1. Shell: navigation bar, shared layout, beasts page adjusted.
2. Drizzle schema and migrations against the Supabase database.
3. Access token: sign, verify, set, clear.
4. GGG client: header parsing, budget claiming, cooldown, 4xx discipline.
5. Session route: profile call, token, tab list, tab picker.
6. Sync: start, tab, finish, resume, prune.
7. Valuation by name, then the variant matchers.
8. The Wealth page: paste card, totals, breakdown, table, chart, forget.

Each step lands on its own; the site stays deployable throughout.
