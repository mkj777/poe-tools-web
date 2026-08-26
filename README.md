# PoE Tools

Every Path of Exile 1 beast currently on the market, sortable by value, plus a
generated Bestiary search pattern for the ones worth farming, and a menu that
points at the tools which already do the rest of the job.

## The Tools menu

Beast prices are the only thing this site hosts. Everything else worth having
already exists and is better than a copy of it would be, so the bar links out
instead of pretending otherwise: FilterBlade for loot filters, Wealthy Exile for
stash wealth, the official trade site, poe.ninja, Awakened PoE Trade for in game
price checks, and Path of Building. Trade and poe.ninja are handed the league
you are looking at, so the link lands where you already are.

## The Leveling tab

The one exception to that rule is
[PoE Leveling Guide](https://github.com/mkj777/poe-leveling-app), because it is
ours: an overlay that puts the next leveling step in the game window. The tab is
a download and three steps, nothing the app explains better itself.

Which release it hands out lives in `src/lib/leveling-app.ts`: one constant,
which both the installer and the portable zip are built from, so a new version
is a one line change.

## What it does

- Lists **all** beasts for the selected league with their chaos value, 7-day
  change and listing count, linked to their poe.ninja page for that league.
- The scarabs a run needs and the current divine rate sit in the top corner,
  with what one map costs to set up — 20 Duplicating, 40 of the Herd, 40
  Kalguuran — next to what the run is worth.
- Sort by any column, search by beast name, genus or habitat.
- **Red or yellow** per row, drawn with the minimap marker the beast actually
  uses, so it is obvious whether the expensive ones are worth the detour.
- **Trash / Sell switch** with a chaos threshold — select everything under it,
  or everything from it up.
- **Bestiary searches** for that selection, ready to paste into the in-game
  Bestiary window. Sell mode gives both halves of the run in order — a red
  search that trashes everything below the threshold, then a green one over
  what is left.
- **Bestiary Sim**: the same beasts in a mock Bestiary window, where a pattern
  can be tried out with every price on screen before anything is released. An
  empty search shows all of them, as the game does.

## The two modes want opposite things

Trashing is destructive. A pattern that shows one expensive beast among the
junk gets it released at the altar, so **no search may ever show a beast above
the threshold** — whatever that costs in extra searches, and even if a beast
has to be left out because nothing can single it out.

Selling is not destructive. The point is to have every valuable beast in front
of you, and a 1c beast in that list costs nothing. So coverage wins: **every
beast above the threshold is selected**, in as few searches as possible, and
the cheap ones that ride along are named rather than avoided.

They are also two halves of one run, which is why sell mode shows both plans:
the trash pattern goes first and empties the Bestiary of everything below the
threshold, so the sell search afterwards runs over a window that holds keepers
only, and its extras are whatever survived. Red is the destructive one, green
the one that only selects — the colour is the reminder of which order they go
in.

| Threshold | Sell — coverage first | Trash — precision first |
| --- | --- | --- |
| 1c | 202 beasts, 2 searches, 12 extras | 16 beasts, 1 search |
| 2c | 185 beasts, 2 searches, 24 extras | 33 beasts, 1 search |
| 4c | 32 beasts, 1 search, no extras | 186 beasts, 4 searches |
| 20c | 16 beasts, 1 search, no extras | 202 beasts, 4 searches |

Nothing is left out any more. "Goatman" sits inside "Goatman Fire-raiser", so
for a long time it could not be singled out at all and was named for the player
to handle by hand. `^goatman$` does it — see the full-line form below.

## Data

| Source | Gives | Refresh |
| --- | --- | --- |
| [poe.ninja economy API](https://poe.ninja/docs/api) | prices, genus, family, habitat for the ~218 beasts with live listings | every 15 min |
| `pathofexile.com/api/trade/data/items` | the full roster of 361 beast names | daily |
| `pathofexile.com/api/trade/search` | prices for the ~143 beasts poe.ninja has no data on | daily, a slice at a time |

Everything is fetched server-side with a descriptive User-Agent.

### Pricing the beasts poe.ninja skips

poe.ninja only lists beasts somebody is currently selling. The rest are priced
by asking the trade site directly — the same fallback Awakened PoE Trade uses.

The answer turned out to be blunt. Of the 143 beasts poe.ninja has no data for,
searching the trade site with offline listings included found **exactly one**:
Tunnelfiend, 4c, a single listing. The other 142 have no listing anywhere.
Anything the game still drops is being sold by someone, so those 142 are not
cheap beasts — they are beasts the game no longer hands out. They are labelled
"not found", hidden behind a chip, and excluded from both patterns, which is
what took the 4c keep pattern from 155 characters down to 127.

That API allows 5 requests per 10 seconds and 30 per 300, so no page render ever
touches it. Instead:

- **`/api/refresh-prices`** runs on a Vercel cron once a day — Hobby plans
  reject anything more frequent, and a deployment carrying `*/10 * * * *` does
  not deploy at all. Each run walks ten names, 5s apart, which is 45s of the
  60s a function gets and about a fortnight to get round all 143. Which slice
  comes from the date, so no state is carried between runs, and entries inside
  their 24 hour TTL cost no request at all. Set `CRON_SECRET` to lock the route
  down; tune with `PRICE_REFRESH_SLICE` and `PRICE_REFRESH_SPACING_MS`. On a
  plan with frequent crons, raise the schedule rather than the slice — the
  limit that matters is GGG's, not Vercel's.
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

The in-game search turned out to be a real, case-insensitive regex engine —
`|`, `.`, `^`, `$`, groups, `[^x]` and `(?!…)` all work, `!` and `"quotes"` do
not, and `.` stops at a line break. What it is *not* is row-oriented: every line
of a row is matched separately and the row is shown if any one of them matches.
A pattern is therefore an alternation of short name fragments:

```
wine.r|rric.g|cic.sa|rric.f|umal.s|wine.c|rric.w|rric.l|wine.v|icic.m|rric.m
```

Each fragment is chosen so it appears in **no** beast outside the selection.
Picking the smallest such set is set cover, so `src/lib/bestiary-regex.ts` uses
the greedy approximation: repeatedly take the fragment covering the most
still-uncovered beasts, then pack the results into 249-character searches.

### What the search reads is not just the name

A Bestiary row is several lines, and every one of them is searchable: the beast
type name, its genus, family and habitat, the name the game generated for that
capture, and every modifier it rolled — names *and* descriptions.

That is where false positives come from, and one got through: a trash pattern
built at 2c brought up Wild Hellion Alpha, worth 50c, because a fragment landed
somewhere in its modifier text. So three corpora are off limits to fragments:

| Corpus | Size | Source |
| --- | --- | --- |
| Bestiary modifiers, names and effects | 28 | `pnpm mods:update` |
| Generic rare monster modifiers | 224 | `pnpm mods:monsters` |
| Words a generated name can be built from | 35,237 combinations | `pnpm words:update` |
| Lines seen in game that neither scrape knows | 3 | `src/lib/observed-mods.ts`, by hand |

That last one matters more than its size. One of the three is the line a beast
keeps for surviving the altar, and it rides along on any beast of any type.

No list of modifier text is ever complete, though, so length carries the rest
of the weight: an **unanchored fragment must be at least six characters**,
since something like `rar` sits inside "Rare pack minions" and is a coin flip
against English prose. Anchored fragments (`^wild.hel`) may be shorter — `^`
binds to the start of a line, so they only ever meet the first characters of a
name, a genus or a modifier.

A literal space is never emitted either: word breaks travel as a `.` wildcard,
because the field does not treat a space as a plain character.

### The full-line form

`^goatman$` is the one fragment that cannot go wrong. Both anchors bind per
line, so the whole line has to equal the fragment — which no generated name and
no modifier ever will. It costs every character of the name plus two, so the
solver reaches for it last, but it is what finally solved the beasts whose name
another beast's name contains: Goatman, Devourer, Plummeting Ursa and the four
Parasite variants. Nothing is unreachable now.

Negation is the one part of the dialect that cannot help. `(?!…)` works, but a
row is shown when *any* of its lines matches, and a modifier line that lacks the
term always satisfies the lookahead — so per-line negation cannot exclude a row.
"Everything except the expensive ones" stays un-expressible, and the cheap
beasts have to be enumerated.

`matchesBestiaryPattern()` implements this reading, and the UI warnings and the
tests are measured against it rather than against `RegExp.test`.

Every probe behind the model, including the ones that disproved earlier
theories, is written up in [docs/bestiary-search.md](docs/bestiary-search.md).

### Trying a pattern without the game

`/<league>/simulation` is that model made visible: every beast with a listing, the lines
the search reads, and a field to paste a pattern into. What comes back is what
the Bestiary would show — except each tile carries the beast's price and the
fragment that matched it, so a trash pattern that turns up something expensive
is visible before the beast is released rather than after. Set the warning line
to the threshold and any match at or above it turns red.

Every beast is rolled into a capture the way the game rolls one: a generated
name from the `Words.dat` word pool, three Bestiary modifiers on a red beast and
one on a yellow, plus a few ordinary monster modifiers. Reroll draws again.

A single roll only proves something about that roll, so the panel above the
tiles asks the question that covers all of them: can any fragment land in *any*
generated name or *any* modifier name? Type `rar` and it answers — inside
"Tempo**rar**ily Revives", so that fragment can bring up any beast in the
league. That was the actual bug behind a 50c beast turning up in a 2c trash
pattern, and a test now asserts the planner never emits such a fragment.

### The length budget

The search field takes **249 characters**, and a truncated pattern silently
matches the wrong beasts, so a pattern is never emitted that does not fit.
Fragments that no longer fit spill into the next search instead.

When a wanted name is fully contained in another (`Parasite` inside `Plated
Parasite`, `Goatman` inside `Goatman Fire-raiser`), no fragment can separate
them, and no number of extra searches helps — a search that finds the one finds
the other. Those beasts are named as unreachable rather than quietly dragged in.

### Where the planning happens

Planning is the only expensive thing the app does, and almost all of it used to
go into one question: can this fragment sit inside any of the 35,237 generated
names? Asked by walking the three word lists it costs ~0.6ms, and a plan asks it
nine thousand times. Every form of the question is a membership test, so the
answers are precomputed into sets once — prefixes, suffixes, substrings and the
seams between them. Ten plans went from **34s to 2.9s**, with byte-identical
output, and a single plan is now 50–550ms.

That is fast enough to stay in the browser for an unusual threshold, in a worker
so the field keeps typing smoothly, and remembered for the session so going back
is instant. The five preset thresholds do not wait at all: both modes for each
are planned on the server and shipped with the page (~26 KB, ~6 gzipped).

Those ten are cached on the **split** — which beasts fall either side of 1, 2, 3,
4 and 5 chaos — not on the prices. Prices move every quarter of an hour, a beast
crosses a preset far more rarely, so most refreshes cost nothing.

### Nothing renders per request

Every visitor sees the same page and poe.ninja recomputes every fifteen minutes,
so there is nothing to render per request. The league lives in the **path**, not
in a query string — `/allflame`, `/allflame/simulation` — which is what lets the
pages be prerendered:

```
○ /                        15m    (redirects to the current league)
● /allflame                15m
● /allflame/simulation     15m
● /standard, /standard/simulation, /hardcore, /allflamehc …
ƒ /api/refresh-prices             (the cron, the only dynamic route)
```

`export const revalidate = 900` plus `generateStaticParams` gives ISR: the HTML
is served from Vercel's CDN with `s-maxage=900, stale-while-revalidate` and
rebuilt in the background once it is that old. On a Hobby plan that matters
twice over — almost no function invocations, and the seconds of pattern planning
happen during the background rebuild rather than in front of somebody.

The live leagues are prerendered at build time; a league that starts later
renders on its first visit and is cached from then on, and a slug that matches no
league 404s. Page renders never reach the trade API — `lookup()` throws unless
the cron has called `allowLiveLookups()` — so a rebuild every quarter of an hour
cannot walk into GGG's rate limit.

## Development

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # regex tests against a real 218-beast fixture
pnpm build

pnpm prices:snapshot            # refresh the committed price fallback (~1 h)
pnpm mods:update                # re-scrape the Bestiary modifier list
pnpm mods:monsters              # re-scrape the generic monster modifier list
pnpm rarity:update              # re-derive which beasts are red
pnpm words:update <words.json>  # re-import the name pool from a Words.dat export
```

Tests run on `node --test` with Node's built-in TypeScript stripping — no test
framework needed. They assert the generated pattern never misses a wanted beast
at several thresholds, and that every false positive is one the caller was
warned about.

## Stack

Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, TypeScript.
