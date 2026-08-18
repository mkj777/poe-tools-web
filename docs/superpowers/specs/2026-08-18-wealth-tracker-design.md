# Wealth tracker — design

**Date:** 2026-08-18
**Status:** approved design, not yet implemented
**Scope:** turn the beast price browser into a multi-tool site and add the first
new tool, Wealth: link a Path of Exile account, sync chosen stash tabs, and see
what they are worth.

## Why

The site already knows how to price Path of Exile 1 items and already talks to
poe.ninja on a schedule. Everything it shows is the same for every visitor.
Wealth is the first feature that belongs to one person: their stash, their
numbers, their history. That means a navigation shell, a datastore, a browser
session and a rate-limited path to Grinding Gear Games' own API — none of which
the project has today.

## Decisions already taken

| Question | Decision |
| --- | --- |
| Account access | POESESSID pasted by the user, multi-user |
| Datastore | Supabase Postgres, Drizzle ORM over the transaction pooler |
| Routing | `/[league]` stays beasts, Wealth at `/[league]/wealth` |
| Sync | User picks tabs, presses Sync; no cron, no auto-sync |
| Valuation | Stackables only in v1 |
| Browser session | Signed cookie, no email, no password |
| Navigation | One top bar: mark and tool tabs left, league select right |

The POESESSID choice was made with the liability understood: the cookie is full
account access, so the design encrypts it at rest, never returns it to a
browser, and offers a one-click delete.

## Out of scope for this spec

- The wealth-over-time chart. Snapshot rows are written from the first sync, so
  the data is there when the chart gets its own spec.
- Hourly/Total and Divines/Percentage toggles, the Sell button, premium tiers.
- Pricing gems, uniques, maps, clusters and rare gear. Those need variant
  matching (level, quality, corruption, links, tier) and are their own spec.
- Official GGG OAuth. If GGG ever grants a client, it slots in beside the paste
  form as a second way to fill the same `accounts` row.

## Architecture

### Routes

| Path | Rendering | Notes |
| --- | --- | --- |
| `/` | redirect | unchanged, sends visitors to the default league |
| `/[league]` | static, `revalidate = 900` | beasts, unchanged — no URL breaks |
| `/[league]/wealth` | `force-dynamic` | per-user, reads the session cookie |
| `POST /api/wealth/link` | dynamic | verify a pasted POESESSID, create the session |
| `POST /api/wealth/unlink` | dynamic | hard delete of the row and the cookie |
| `GET\|PUT /api/wealth/tabs` | dynamic | read and write which tabs count |
| `POST /api/wealth/sync` | dynamic, `maxDuration = 60` | run one sync |

A new `src/app/[league]/layout.tsx` renders the navigation bar, so both tools
share it and the beasts page keeps its own prerendering.

### Navigation

`src/components/site-nav.tsx`, a client component. Mark and tool tabs on the
left, the existing `LeagueSelect` on the right. Switching league keeps the
current tool: the component reads `usePathname` and swaps only the first
segment. The beasts page gives up its gutter copy of the league select and the
simulation link, which move into the bar; the large logo and the scarab cards
stay where they are.

### Identity and secrets

There are no site accounts. Pasting a POESESSID makes the server call GGG's
`/api/profile` with that cookie; a successful response names the account and
proves the cookie works. The row is created, and the browser receives a
`wealth_sid` cookie — 32 random bytes, `httpOnly`, `secure`, `sameSite=lax`, one
year. Only the SHA-256 of that token is stored, so a database leak does not hand
over live sessions.

The POESESSID itself is encrypted with AES-256-GCM under `WEALTH_ENC_KEY` (a
32-byte key held in Vercel's environment, never in the database), with a fresh
IV per row. It is never sent to a browser again and never logged. The interface
shows `linked as <account> ••••`. Unlink deletes the row outright rather than
flagging it.

The paste form says in plain words what the cookie grants and that logging out
of pathofexile.com revokes it. The link endpoint is rate limited so it cannot be
used to test stolen cookies in bulk.

### Schema

Drizzle migrations live in the repo and run against Supabase Postgres through
the transaction pooler. There is no browser-side Supabase client and no anon
key: the connection string is a server secret, and every query runs inside a
route handler or a server component.

```
accounts        id, poe_account_name unique, sess_enc, sess_iv,
                created_at, last_sync_at, last_error
sessions        token_hash pk, account_id, expires_at
tab_selections  (account_id, league, tab_id) pk, tab_index, name, colour,
                type, selected
snapshots       id, account_id, league, taken_at, total_chaos, divine_rate
snapshot_items  snapshot_id, name, category, tab_id, stack, chaos_each,
                chaos_total
ggg_cooldown    scope pk ('ip'), until
```

The newest snapshot is the current view; the same rows are the history the chart
will read later. Snapshots older than 30 days, or beyond 200 per account, are
pruned — the free tier is 500 MB and an untended stash of 500 items would fill
it.

### The GGG client

Every request to pathofexile.com goes through `src/lib/ggg/client.ts`. Nothing
calls `fetch` against GGG directly.

- It reads `X-Rate-Limit-Account`, `-Ip` and `-Client` (`limit:period:penalty`)
  along with the matching `-State` headers (`hits:period:penalty-left`). Within
  two hits of any limit it sleeps out the period rather than spending the last
  of the budget.
- A `429` or an active penalty writes `ggg_cooldown.until` and aborts. In-memory
  state is useless here: each lambda is its own process, so the database row is
  the only shared truth.
- A minimum spacing of 1200 ms separates requests.
- The User-Agent identifies the app and carries a contact address, matching what
  `ninja.ts` already sends.

This matters more than it looks. On Vercel every user's request leaves from the
same handful of IPs, so `X-Rate-Limit-Ip` is a budget shared by the whole
userbase, and one careless sync locks everyone out — including the game client
on the machine that triggered it.

### Sync

`POST /api/wealth/sync`, with `maxDuration = 60`:

1. Check `ggg_cooldown`, then the account's own five-minute cooldown. Either one
   answers `429` with the seconds remaining.
2. Fetch the tab list:
   `get-stash-items?accountName=…&realm=pc&league=…&tabs=1&tabIndex=0`. Upsert
   into `tab_selections`; tabs seen for the first time default to unselected.
3. Fetch each selected tab in turn, one request per tab.
4. Price the items and write `snapshots` plus `snapshot_items` in one
   transaction, then stamp `last_sync_at`.
5. At most 25 tabs may be selected. Twenty-five requests at 1200 ms is thirty
   seconds, which fits inside the sixty-second ceiling with room for the
   database write. The tab editor refuses the twenty-sixth.

If GGG rejects the cookie, the row's `last_error` records it and the page asks
for a fresh paste instead of retrying.

### Valuation

`src/lib/wealth/price.ts` builds a name-to-chaos map per league from poe.ninja,
cached on the same 900-second window the rest of the site uses. Covered types:
Currency, Fragment, DivinationCard, Essence, Scarab, Oil, Fossil, Resonator,
DeliriumOrb, Omen, Tattoo, Incubator, Artifact and Allflame. The exact endpoint
shapes are confirmed against poe.ninja while building — poe.ninja is safe to
call, GGG is not.

An item's key is its `typeLine`, falling back to `baseType`; quantity is
`stackSize` or one. Chaos Orb is pinned at 1. Anything without a match is
categorised `Unpriced` and reported as its own line rather than guessed at or
silently dropped. The divine rate comes from the existing `getDivinePrice`, so
totals can read `5.1d` the way the reference screenshot does.

### Interface

`/[league]/wealth` without a cookie is a single paste card: the input, the
warning, a Link button.

Linked, it is the total in chaos and divines, a Breakdown card grouped by
category, a sidebar listing the tabs with checkboxes, and a table of items —
name, tab, quantity, unit price, total — that sorts and filters. It reuses the
existing shadcn table, input and badge components and the current dark theme.
The Sync button shows how long ago the last sync ran and counts down while the
cooldown holds. The unpriced count sits beside the total as its own line.

## Testing

`node --test`, the harness already in the repo. No test touches GGG.

- Encryption round-trip; decryption under the wrong key fails.
- Rate-limit header parsing: normal, near-limit, and `429` with `Retry-After`.
- Cooldown arithmetic, both the shared row and the per-account window.
- Cookie token signing and verification; a tampered token is rejected.
- Pricing: stacks, the pinned Chaos Orb, unpriced items, unknown categories.
- The sync mapper against a checked-in, sanitised `get-stash-items` fixture.

## Environment

| Variable | Purpose |
| --- | --- |
| `SUPABASE_DB_URL` | Postgres connection through the transaction pooler |
| `WEALTH_ENC_KEY` | 32-byte base64 key for POESESSID encryption |
| `WEALTH_COOKIE_SECRET` | HMAC secret for the session cookie |

New dependencies: `drizzle-orm`, `postgres`, and `drizzle-kit` for development.
No authentication library; `node:crypto` covers the encryption, hashing and
signing.

## Risks

- **Shared IP budget.** The limiter is the entire mitigation. If the site ever
  draws a crowd, syncing needs a real queue with a single worker.
- **Cookies expire.** GGG invalidates a POESESSID on logout and on some IP
  changes. The failure is visible and asks for a new paste; nothing retries in a
  loop.
- **Free-tier storage.** Pruning is part of the feature, not a later cleanup.
- **Holding other people's sessions.** Encryption and hard delete reduce the
  blast radius; they do not remove it. If the site is ever shared publicly, this
  is the thing to revisit first.

## Build order

1. Shell: navigation bar, shared layout, beasts page adjusted.
2. Datastore: Supabase project, Drizzle schema, migrations.
3. Link and unlink: paste form, encryption, session cookie.
4. GGG client and limiter.
5. Sync: tab list, tab selection, tab fetch, snapshot write.
6. Valuation and the Wealth page.

Each step lands on its own; the site stays deployable throughout.
