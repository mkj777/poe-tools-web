# Wealth tracker — design

**Date:** 2026-08-18
**Status:** approved design, not yet implemented
**Scope:** turn the beast price browser into a multi-tool site and add the first
new tool, Wealth: sign up, link a Path of Exile account, sync chosen stash tabs,
and watch what they are worth over time.

## Why

The site already knows how to price Path of Exile 1 items and already talks to
poe.ninja on a schedule. Everything it shows is the same for every visitor.
Wealth is the first feature that belongs to one person: their account, their
stash, their history. That means a navigation shell, a datastore, sign-in, and a
rate-limited path to Grinding Gear Games' own API — none of which the project
has today.

## Decisions already taken

| Question | Decision |
| --- | --- |
| Site accounts | Supabase Auth, email and password, kept minimal |
| Stash access | POESESSID pasted by the signed-in user |
| Datastore | Supabase Postgres, SQL migrations in the repo, RLS on |
| Routing | `/[league]` stays beasts, Wealth at `/[league]/wealth` |
| Sync | User picks tabs, presses Sync; no cron, no auto-sync |
| Valuation | Stackables only in v1 |
| History | Every sync writes a snapshot; the page charts them |
| Navigation | One top bar: mark and tool tabs left, league select right |

The POESESSID choice was made with the liability understood: the cookie is full
account access, so the design encrypts it at rest, never returns it to a
browser, and offers a one-click delete.

## Out of scope for this spec

- Hourly/Total and Divines/Percentage toggles, the Sell button, premium tiers.
- Pricing gems, uniques, maps, clusters and rare gear. Those need variant
  matching (level, quality, corruption, links, tier) and are their own spec.
- Official GGG OAuth. If GGG ever grants a client, it slots in beside the paste
  form as a second way to fill the same row.
- Social sign-in, password reset by mail, email verification. See the note on
  Supabase's built-in mailer below.

## Architecture

### Routes

| Path | Rendering | Notes |
| --- | --- | --- |
| `/` | redirect | unchanged, sends visitors to the default league |
| `/[league]` | static, `revalidate = 900` | beasts, unchanged — no URL breaks |
| `/[league]/wealth` | `force-dynamic` | per-user, reads the auth session |
| `/sign-in`, `/sign-up` | dynamic | two small forms, one shared card |
| `POST /api/wealth/link` | dynamic | verify a pasted POESESSID, store it |
| `POST /api/wealth/unlink` | dynamic | hard delete of the stored cookie |
| `GET or PUT /api/wealth/tabs` | dynamic | read and write which tabs count |
| `POST /api/wealth/sync` | dynamic, `maxDuration = 60` | run one sync |

A new `src/app/[league]/layout.tsx` renders the navigation bar, so both tools
share it and the beasts page keeps its own prerendering.

### Navigation

`src/components/site-nav.tsx`, a client component. Mark and tool tabs on the
left, the existing `LeagueSelect` on the right, and the account control beside
it — "Sign in" or the user's email with a sign-out item. Switching league keeps
the current tool: the component reads `usePathname` and swaps only the first
segment. The beasts page gives up its gutter copy of the league select and the
simulation link, which move into the bar; the large logo and the scarab cards
stay where they are.

### Accounts

Supabase Auth, email and password, nothing else. `@supabase/ssr` creates the
server client and keeps the session in cookies; middleware refreshes the token
on navigation. Sign-up creates the `auth.users` row and, through a database
trigger, a matching `profiles` row — so application tables have one stable key
to hang off and the interface has somewhere to put a display name later.

Email confirmation stays **off**. Supabase's built-in mailer allows two messages
an hour and is meant for testing; turning confirmation on without wiring an
external SMTP provider would lock people out of their own sign-ups. Adding
Resend later turns confirmation and password reset on together.

### Stash access and secrets

Linking is a separate step from signing in. A signed-in user pastes their
POESESSID; the server calls GGG's `/api/profile` with it, which both names the
account and proves the cookie works, then stores it against their user id.

The POESESSID is encrypted with AES-256-GCM under `WEALTH_ENC_KEY` (a 32-byte
key held in Vercel's environment, never in the database), with a fresh IV per
row. It is never sent to a browser again and never logged. The interface shows
`linked as <account> ••••`. Unlink deletes the row outright rather than flagging
it. The link endpoint is rate limited so it cannot be used to test stolen
cookies in bulk.

`poe_links` carries a deny-all RLS policy: no client session can read it under
any circumstance, and only server code holding the service role touches it. The
other tables carry owner-only policies, so a mistake in a query cannot show one
user another user's stash.

### Schema

SQL migrations live in `supabase/migrations` and run with the Supabase CLI. RLS
is enabled on every table.

```
profiles        id uuid pk -> auth.users(id) cascade, display_name, created_at
                RLS: owner reads and updates

poe_links       user_id uuid pk -> auth.users(id) cascade, poe_account_name,
                sess_enc, sess_iv, linked_at, last_sync_at, last_error
                RLS: deny all; service role only

tab_selections  (user_id, league, tab_id) pk, tab_index, name, colour, type,
                selected
                RLS: owner reads and writes

snapshots       id bigserial pk, user_id, league, taken_at, total_chaos,
                divine_rate
                RLS: owner reads

snapshot_items  snapshot_id -> snapshots(id) cascade, name, category, tab_id,
                stack, chaos_each, chaos_total
                RLS: owner reads through the parent snapshot

ggg_cooldown    scope text pk, until timestamptz
                RLS: deny all; service role only
```

The newest snapshot is the current view; the same rows are the history the chart
reads. Snapshots older than 30 days, or beyond 200 per user, are pruned on each
sync — the free tier is 500 MB and an untended stash of 500 items would fill it.

There is no ORM. Server code uses `@supabase/supabase-js`: the user's own client
for reads, which RLS constrains, and the service-role client only for the sync
write and anything touching `poe_links`.

### The GGG client

Every request to pathofexile.com goes through `src/lib/ggg/client.ts`. Nothing
calls `fetch` against GGG directly.

- It reads `X-Rate-Limit-Account`, `-Ip` and `-Client` (`limit:period:penalty`)
  along with the matching `-State` headers (`hits:period:penalty-left`). Within
  two hits of any limit it sleeps out the period rather than spending the last
  of the budget.
- A `429` or an active penalty writes the cooldown row and aborts. In-memory
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

1. Require a signed-in user and a linked POESESSID.
2. Check the shared cooldown row, then the user's own five-minute cooldown.
   Either one answers `429` with the seconds remaining.
3. Fetch the tab list from `get-stash-items` with `tabs=1`. Upsert into
   `tab_selections`; tabs seen for the first time default to unselected.
4. Fetch each selected tab in turn, one request per tab.
5. Price the items and write `snapshots` plus `snapshot_items` in one
   transaction, then stamp `last_sync_at` and prune old snapshots.
6. At most 25 tabs may be selected. Twenty-five requests at 1200 ms is thirty
   seconds, which fits inside the sixty-second ceiling with room for the
   database write. The tab editor refuses the twenty-sixth.

If GGG rejects the cookie, `last_error` records it and the page asks for a fresh
paste instead of retrying.

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
silently dropped. The divine rate is stored on the snapshot alongside the chaos
total, so an old point on the chart keeps the rate it was taken at instead of
being rewritten by today's exchange.

### Interface

Signed out, `/[league]/wealth` is a short pitch and a link to sign up. Signed in
without a link, it is the paste card: the input, the warning about what the
cookie grants, a Link button.

Linked, it is:

- the total in chaos and divines, with the change since the oldest point in the
  selected range;
- the chart — one line, total chaos over time, with a 24 hours / 7 days / 30
  days range picker, drawn from `snapshots`;
- a Breakdown card grouped by category;
- a sidebar listing the tabs with checkboxes;
- a table of items — name, tab, quantity, unit price, total — that sorts and
  filters.

It reuses the existing shadcn table, input and badge components and the current
dark theme. The Sync button shows how long ago the last sync ran and counts down
while the cooldown holds. The unpriced count sits beside the total as its own
line. A single sync leaves one point, so the chart says so rather than drawing a
flat line pretending to be history.

## Testing

`node --test`, the harness already in the repo. No test touches GGG or Supabase
over the network.

- Encryption round-trip; decryption under the wrong key fails.
- Rate-limit header parsing: normal, near-limit, and `429` with `Retry-After`.
- Cooldown arithmetic, both the shared row and the per-user window.
- Pricing: stacks, the pinned Chaos Orb, unpriced items, unknown categories.
- The sync mapper against a checked-in, sanitised `get-stash-items` fixture.
- Chart series building: range filtering, gaps, a single point.

RLS policies are checked once by hand against the Supabase dashboard with two
test users, since they are database configuration rather than repository code.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL, safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key, constrained by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server only: sync writes and `poe_links` |
| `WEALTH_ENC_KEY` | 32-byte base64 key for POESESSID encryption |

New dependencies: `@supabase/supabase-js`, `@supabase/ssr`, and `recharts` for
the chart. No ORM and no authentication library; `node:crypto` covers the
encryption.

## Risks

- **Shared IP budget.** The limiter is the entire mitigation. If the site ever
  draws a crowd, syncing needs a real queue with a single worker.
- **Cookies expire.** GGG invalidates a POESESSID on logout and on some IP
  changes. The failure is visible and asks for a new paste; nothing retries in a
  loop.
- **Free-tier storage.** Pruning is part of the feature, not a later cleanup.
- **Holding other people's sessions.** Encryption, deny-all RLS and hard delete
  reduce the blast radius; they do not remove it. If the site is ever shared
  widely, this is the thing to revisit first.
- **No email confirmation.** Anyone can sign up with an address they do not own.
  Acceptable while the account holds nothing but a stash link the same person
  must paste; revisit before anything of value hangs off an address.

## Build order

1. Shell: navigation bar, shared layout, beasts page adjusted.
2. Supabase project, migrations, RLS, the `profiles` trigger.
3. Sign-up, sign-in, sign-out, the account control in the bar.
4. Link and unlink: paste form, encryption, `poe_links`.
5. GGG client and limiter.
6. Sync: tab list, tab selection, tab fetch, snapshot write, pruning.
7. Valuation, the Wealth page, the chart.

Each step lands on its own; the site stays deployable throughout.
