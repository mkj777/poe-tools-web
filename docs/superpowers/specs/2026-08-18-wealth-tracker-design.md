# Wealth tracker — design

**Date:** 2026-08-18 (revised 2026-08-19)
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

## Decisions already taken

| Question | Decision |
| --- | --- |
| Site accounts | None. No sign-up, no sign-in, no email, no password |
| Stash access | POESESSID, kept in the visitor's browser, sent per sync |
| Where the cookie lives | `localStorage` on the visitor's machine. Never on the server |
| Datastore | Supabase Postgres: snapshots and tab choices, keyed by PoE account name |
| Who may read a history | Only a browser holding a signed access token |
| Routing | `/[league]` stays beasts, Wealth at `/[league]/wealth` |
| Sync | Visitor picks tabs, presses Sync; no cron, no background jobs |
| Valuation | Everything poe.ninja publishes a price for |
| History | Every sync writes a snapshot; the page charts them |
| Navigation | One top bar: mark and tool tabs left, league select right |

### Why the cookie has to touch the server at all

A browser cannot call pathofexile.com directly: GGG sends no CORS headers and a
third-party cookie would not be attached anyway. Every stash read therefore goes
through a route handler on this site. The design's answer is not to pretend
otherwise but to bound it: the cookie arrives in the request body, lives in the
lambda's memory for the length of that sync, is never written to any table,
never logged, and never returned in a response. Only a browser extension or a
desktop app could avoid the hop entirely.

## Out of scope for this spec

- **Share links.** A later opt-in: a token in the URL that makes one history
  readable to anyone holding the link, for streaming or guild comparison. The
  schema below leaves room for it; nothing is public by default.
- Hourly/Total and Divines/Percentage toggles, the Sell button, premium tiers.
- Rare gear valuation. poe.ninja has no price for a rare, and searching the
  trade API per item is exactly what earns an IP lockout.
- Official GGG OAuth. If GGG ever grants a client, it becomes a second way to
  authorise a sync and changes nothing else.

## Architecture

### Routes

| Path | Rendering | Notes |
| --- | --- | --- |
| `/` | redirect | unchanged, sends visitors to the default league |
| `/[league]` | static, `revalidate = 900` | beasts, unchanged — no URL breaks |
| `/[league]/wealth` | `force-dynamic` | reads the access token, renders that history |
| `POST /api/wealth/sync` | dynamic, `maxDuration = 60` | the only route that sees a POESESSID |
| `GET \| PUT /api/wealth/tabs` | dynamic | read and write which tabs count |
| `POST /api/wealth/forget` | dynamic | delete every row for this account, clear the token |

A new `src/app/[league]/layout.tsx` renders the navigation bar, so both tools
share it and the beasts page keeps its own prerendering.

### Navigation

`src/components/site-nav.tsx`, a client component. Mark and tool tabs on the
left, the existing `LeagueSelect` on the right. Switching league keeps the
current tool: the component reads `usePathname` and swaps only the first
segment. The beasts page gives up its gutter copy of the league select and the
simulation link, which move into the bar; the large logo and the scarab cards
stay where they are.

### Identity without accounts

There is no user table and nothing to sign up for. A history is keyed by the
Path of Exile account name, and the right to read it is proved by holding the
session cookie for that account:

1. The visitor pastes a POESESSID. It is stored in `localStorage` under
   `wealth.poesessid` and kept there — this is a deliberate choice for
   convenience, and the paste form says plainly that anything able to run
   script on this domain could read it.
2. A sync sends the cookie to `POST /api/wealth/sync`. The server calls GGG's
   `/api/profile` with it, which both names the account and proves the cookie is
   live.
3. The response sets `wealth_access`: an HMAC-signed, httpOnly, `secure`,
   `sameSite=lax` cookie carrying the account name and an expiry thirty days
   out, signed with `WEALTH_TOKEN_SECRET`. Nothing about it is stored server
   side — the signature is the whole check.
4. Page loads and history reads require that cookie. Knowing an account name is
   not enough; without a valid signature the answer is 404. That closes the
   enumeration hole that would otherwise turn the database into a searchable
   list of who is rich, which is the input phishers want.

A new machine repeats step 1 and lands on the same history. `POST
/api/wealth/forget` deletes every row for the account and clears both the cookie
and `localStorage`.

### Schema

SQL migrations live in `supabase/migrations` and run with the Supabase CLI.
Every table has RLS enabled with **no policies at all**: the anon key can read
nothing, and only server routes holding the service role touch the data. There
is no browser-side Supabase client and no anon key in the bundle.

```
stash_accounts   poe_account_name text pk, first_seen, last_sync_at, last_error

tab_selections   (poe_account_name, league, tab_id) pk, tab_index, name,
                 colour, type, selected

snapshots        id bigserial pk, poe_account_name, league, taken_at,
                 total_chaos, unpriced_count, divine_rate
                 index (poe_account_name, league, taken_at desc)

snapshot_items   snapshot_id -> snapshots(id) cascade, name, category, tab_id,
                 stack, chaos_each, chaos_total
                 index (snapshot_id)

ggg_cooldown     scope text pk, until timestamptz
```

No table has a column for the session cookie. The newest snapshot is the current
view; the same rows are the history the chart reads. Snapshots older than 30
days, or beyond 200 per account and league, are pruned at the end of each sync —
the free tier is 500 MB and an untended stash of 500 items would fill it.

### The GGG client

Every request to pathofexile.com goes through `src/lib/ggg/client.ts`. Nothing
calls `fetch` against GGG directly.

- It reads `X-Rate-Limit-Account`, `-Ip` and `-Client` (`limit:period:penalty`)
  along with the matching `-State` headers (`hits:period:penalty-left`). Within
  two hits of any limit it sleeps out the period rather than spending the last
  of the budget.
- A `429` or an active penalty writes `ggg_cooldown` and aborts the sync with a
  message naming the seconds left. In-memory state is useless here: each lambda
  is its own process, so the database row is the only shared truth.
- A minimum spacing of 1200 ms separates requests.
- The User-Agent identifies the app and carries a contact address, matching what
  `ninja.ts` already sends.

This matters more than it looks. On Vercel every visitor's request leaves from
the same handful of IPs, so `X-Rate-Limit-Ip` is a budget shared by everyone,
and one careless sync locks the rest out — including the game client on the
machine that triggered it.

### Sync

`POST /api/wealth/sync`, with `maxDuration = 60`:

1. Read the POESESSID from the request body. Refuse if it is missing or
   malformed.
2. Check `ggg_cooldown`, then a five-minute per-account cooldown from
   `stash_accounts.last_sync_at`. Either one answers `429` with the seconds
   remaining.
3. Call `/api/profile` to name the account, then issue or refresh the access
   cookie.
4. Fetch the tab list from `get-stash-items` with `tabs=1`, and upsert
   `tab_selections`. Tabs seen for the first time default to unselected.
5. Fetch each selected tab in turn, one request per tab.
6. Price the items, then write `snapshots` and `snapshot_items` in one
   transaction, stamp `last_sync_at`, and prune.
7. At most 25 tabs may be selected. Twenty-five requests at 1200 ms is thirty
   seconds, which fits inside the sixty-second ceiling with room for the
   write. The tab editor refuses the twenty-sixth.

If GGG rejects the cookie, `last_error` records it and the page asks for a fresh
paste instead of retrying.

### Valuation

`src/lib/wealth/price.ts` builds one lookup per league from poe.ninja, cached on
the same 900-second window the rest of the site uses and shared by every
visitor, so a sync costs no poe.ninja calls of its own.

Matched by name alone: Currency, Fragment, Scarab, Essence, DivinationCard, Oil,
Fossil, Resonator, DeliriumOrb, Omen, Tattoo, Incubator, Artifact, Allflame,
Vial, Invitation, Beast. Chaos Orb is pinned at 1.

Matched with variants, because poe.ninja prices these per variant:

- **Unique weapons, armour, accessories, flasks, jewels** — name, link count
  (5L and 6L are separate lines), corrupted, and the variant string where
  poe.ninja carries one.
- **Skill gems** — name, level, quality, corrupted; the common shapes are
  20/20, 21/20, 20/23 and level 1 alternate qualities.
- **Maps** — base name, tier, blighted or blight-ravaged, unique maps by name.
- **Cluster jewels** — base, item level band, enchantment.

An item's fallback key is `typeLine`, then `baseType`; quantity is `stackSize`
or one. Anything left unmatched is categorised `Unpriced`, counted, and shown as
its own line rather than guessed at or silently dropped — that count is stored
on the snapshot so the chart never implies a total it did not have.

The divine rate is stored per snapshot, so an old point keeps the rate it was
taken at instead of being rewritten by today's exchange.

### Interface

Without an access cookie, `/[league]/wealth` is the paste card: what the tool
does, the input, a plain warning about what a session cookie grants and that
logging out of pathofexile.com revokes it, and a Sync button.

With one, the page is:

- the total in chaos and divines, with the change across the selected range;
- the chart — total chaos over time, 24 hours / 7 days / 30 days, from
  `snapshots` alone;
- a Breakdown card grouped by category, aggregated in SQL rather than in the
  browser;
- a sidebar listing the tabs with checkboxes;
- a table of items — name, tab, quantity, unit price, total — sortable and
  filterable, virtualised past a few hundred rows;
- a Forget button that deletes everything.

It reuses the existing shadcn table, input and badge components and the current
dark theme. The Sync button shows how long ago the last sync ran and counts down
while a cooldown holds. A single sync leaves one point, and the chart says so
rather than drawing a flat line pretending to be history.

## Performance

- Price lookups are per league, not per visitor, and live in the same ISR cache
  as the beast prices. A sync makes zero poe.ninja requests.
- The chart query reads `snapshots` only — a few hundred narrow rows — and never
  touches `snapshot_items`.
- The breakdown is a `group by category` in Postgres, so the page ships an
  aggregate rather than every item twice.
- The item table is virtualised; a 5000-item stash renders the same as a 50-item
  one.
- Sync cost is bounded by the rate limiter, not by the code: 25 tabs, 1200 ms
  apart, one round trip each.

## Testing

`node --test`, the harness already in the repo. No test touches GGG or Supabase
over the network.

- Access token: sign, verify, reject a tampered payload, reject an expired one.
- Rate-limit header parsing: normal, near-limit, and `429` with `Retry-After`.
- Cooldown arithmetic, both the shared row and the per-account window.
- Pricing: stacks, the pinned Chaos Orb, 6-link uniques, corrupted gems, map
  tiers, unpriced items, unknown categories.
- The sync mapper against a checked-in, sanitised `get-stash-items` fixture.
- Chart series building: range filtering, gaps, a single point.
- A guard test that no source file writes a POESESSID anywhere but a request to
  pathofexile.com.

## Environment

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | project URL, server only |
| `SUPABASE_SERVICE_ROLE_KEY` | the only key the app holds; never in the bundle |
| `WEALTH_TOKEN_SECRET` | HMAC secret for the access cookie |

New dependencies: `@supabase/supabase-js` and `recharts`. No ORM, no
authentication library, no `@supabase/ssr` — there is no auth session to
refresh. `node:crypto` covers the signing.

## Risks

- **Shared IP budget.** The limiter is the entire mitigation. If the site draws
  a crowd, syncing needs a real queue with a single worker.
- **POESESSID in `localStorage`.** Readable by anything that can run script on
  this domain. The mitigation is that nothing third-party runs here: no
  analytics, no CDN scripts, a strict CSP, and no `dangerouslySetInnerHTML` on
  anything derived from stash data.
- **The server sees the cookie in transit.** Bounded, not eliminated. The guard
  test and code review are what keep it bounded.
- **Cookies expire.** GGG invalidates a POESESSID on logout and on some IP
  changes. The failure is visible and asks for a new paste; nothing retries in a
  loop.
- **Free-tier storage.** Pruning is part of the feature, not a later cleanup.
- **Stash contents are other people's data.** Closed by default, deletable in
  one click, and only ever public if a share link is later created on purpose.

## Build order

1. Shell: navigation bar, shared layout, beasts page adjusted.
2. Supabase project, migrations, RLS off-limits by default.
3. Access token: sign, verify, set, clear.
4. GGG client and limiter.
5. Sync: profile, tab list, tab selection, tab fetch, snapshot write, pruning.
6. Valuation, starting with name-matched types, then the variant matchers.
7. The Wealth page: paste card, totals, breakdown, table, chart, forget.

Each step lands on its own; the site stays deployable throughout.
