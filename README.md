# PoE Beast Prices

Every Path of Exile 1 beast currently on the market, sortable by value, plus a
generated Bestiary search pattern for the ones worth farming.

![Beast Prices](docs/screenshot.png)

## What it does

- Lists **all** beasts for the selected league with Chaos value, Divine value,
  7-day change and listing count.
- Sort by any column, search by beast name, genus or habitat.
- **Min chaos filter** — hide everything below a threshold.
- **Bestiary regex** — a search pattern matching the beasts above that
  threshold, ready to paste into the in-game Bestiary window, plus the inverse
  pattern for everything below it.

## Data

| Source | Gives | Refresh |
| --- | --- | --- |
| [poe.ninja economy API](https://poe.ninja/docs/api) | prices, genus, family, habitat for the ~218 beasts with live listings | hourly |
| `pathofexile.com/api/trade/data/items` | the full roster of 361 beast names | daily |
| `pathofexile.com/api/trade/search` | prices for the ~143 beasts poe.ninja has no data on | daily, a slice at a time |

Everything is fetched server-side with a descriptive User-Agent.

### Pricing the beasts poe.ninja skips

poe.ninja only lists beasts somebody is currently selling. The rest are priced
by asking the trade site directly — the same fallback Awakened PoE Trade uses.
A beast nobody sells is worth **0c**, which is a real answer, and it shows up in
the table as such.

That API allows 5 requests per 10 seconds and 30 per 300, so no page render ever
touches it. Instead:

- **`/api/refresh-prices`** runs on a Vercel cron every ten minutes and refreshes
  a slice of eight, paced 2.2s apart. Which slice comes from the clock, so no
  state is carried between runs. Entries inside their 24 hour TTL are served
  from the Next.js data cache and cost no request at all, so in practice each
  beast is looked up once a day. Set `CRON_SECRET` to lock the route down; tune
  with `PRICE_REFRESH_SLICE` and `PRICE_REFRESH_SPACING_MS`.
  *Vercel's Hobby plan only permits daily crons — on that plan raise the slice
  instead.*
- **`src/lib/trade-prices.fallback.json`** is a committed snapshot, served when
  the cache is cold: a fresh deployment shows real prices immediately rather
  than a table full of dashes. Regenerate it with `pnpm prices:snapshot`. It
  paces itself, resumes where it stopped, and takes about an hour — run it when
  you are not playing, since the rate limit is per IP.

Two things that bit us and are now guarded:

- **`status` must not be `"online"`.** With it, every single beast came back
  with zero listings. Awakened PoE Trade sends `available`, `securable` or
  `any`; the snapshot uses `any`, the widest net. Before doing anything, the
  script now asks about the beast poe.ninja sees the most listings for — if
  even that returns nothing, the query is wrong and it aborts instead of
  recording a table full of zeroes.
- **Exceeding 30 requests per 300s locks the whole IP out for half an hour**,
  game client included. Both the script and the cron take a minority share of
  every bucket and read the rate-limit headers.

## The Bestiary regex

The in-game search is a case-insensitive regex over the beast name, so the
generated pattern is an alternation of short name fragments:

```
wild.b|k.m|cry|cys|l.pl|grav|e.pl|ushc|man.f|numus|vid.v|and.sk|icic.cro|ild.hell|parasite
```

Each fragment is chosen so it appears in **no** beast below the threshold.
Picking the smallest such set is set cover, so `src/lib/bestiary-regex.ts` uses
the greedy approximation: repeatedly take the fragment covering the most
still-uncovered beasts.

A second pattern below it does the inverse — everything *under* the threshold,
for clearing out the cheap ones.

### The search is not a substring search

Two rounds of in-game testing turned up beasts that came back for patterns they
share no substring with:

| Pattern contained | Beast that came back |
| --- | --- |
| `l p` | Sulphuric Scorpion, Scum Crawler |
| `fir`, `ris` | Farric Ursa, Farric Lynx Alpha |

Checked against all 218 names, one reading explains every one of them:
**the field matches subsequences.** The characters have to appear in order, but
not next to each other — `ris` is in "fa**r**r**i**c ur**s**a", `fir` is in
"**f**arr**i**c u**r**sa".

So a fragment counts as unsafe if it hits an unwanted beast *either* way,
substring or subsequence. That holds whichever the game actually does, and it
costs little: the 4c pattern went from 92 to 138 characters, still well inside
the budget. A literal space is never emitted either — word breaks travel as a
`.` wildcard.

`matchesBestiaryPattern()` implements that combined reading, and both the UI
warnings and the tests are measured against it rather than against
`RegExp.test`.

### The length budget

The search field takes **249 characters**, and a truncated pattern silently
matches the wrong beasts, so the generator never emits one that does not fit.
If nothing fits, it says so instead of handing over something broken.

Precision is what gets traded for length. Fragments are scored by how many
*unwanted* beasts they also match, and the solver runs the whole range from
"no false positives allowed" to "quite permissive", keeping the most precise
pattern that fits. Looser is not simply worse: a permissive fragment sometimes
covers a beast that would otherwise force a very broad fallback word.

When a wanted name is fully contained in a cheaper one (`Parasite` inside
`Plated Parasite`), no fragment can separate them at all. The pattern keeps the
wanted beast and the UI names the extras you will also see.

## Development

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # regex tests against a real 218-beast fixture
pnpm build

pnpm prices:snapshot            # refresh the committed price fallback (~25 min)
pnpm mods:update                # re-scrape the Bestiary modifier list
pnpm words:update <words.json>  # re-import the name pool from a Words.dat export
```

Tests run on `node --test` with Node's built-in TypeScript stripping — no test
framework needed. They assert the generated pattern never misses a wanted beast
at several thresholds, and that every false positive is one the caller was
warned about.

## Stack

Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, TypeScript.
