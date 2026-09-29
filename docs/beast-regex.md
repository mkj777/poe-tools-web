# Beast Regex

Live at <https://www.pathoftools.app/beasts>, which redirects to the current
league, for example `/beasts/standard`.

Beast Regex lists every Path of Exile beast on the market for one league and
writes the in game Bestiary search for the ones worth selling, or for the ones
to release. This file explains how it works. The in game testing the generator
is built on is logged separately in [bestiary-search.md](bestiary-search.md).

## What the page does

- Lists every beast with a listing for the selected league, with its chaos
  value, its seven day change and its listing count, linked to its poe.ninja
  page.
- Sorts by any column and filters by beast name, genus or habitat.
- Marks each row red or yellow with the minimap marker the beast uses, so it is
  clear whether an expensive one is worth the detour.
- A side panel shows the scarabs a beast farming run uses (20 Duplicating, 40
  of the Herd, 40 Kalguuran), what one map's worth costs, and the current
  divine and mirror rates.
- A **Sell / Trash** switch and a chaos threshold (presets 1 to 5, or any
  number) select everything from the threshold up, or everything under it.
- For that selection it writes **Bestiary searches** to paste into the search
  field of the Bestiary window, each with a copy button.
- A help tip beside the controls explains the search dialect in short.

Source: `src/app/beasts/[league]/page.tsx`, `src/components/beast-table.tsx`,
`src/lib/bestiary-regex.ts`, `src/lib/use-bestiary-pattern.ts`,
`src/lib/bestiary.worker.ts`.

## The two modes want opposite things

Trashing is destructive. A pattern that shows one expensive beast among the
junk gets it released at the altar, so **no trash search may ever show a beast
above the threshold**, whatever that costs in extra searches.

Selling is not destructive. The point is to have every valuable beast in front
of you, and a 1c beast in that list costs nothing. So coverage wins: **every
beast from the threshold up is selected**, in as few searches as possible, and
the cheap ones that ride along are named rather than avoided.

Sell mode is one run in up to three steps, in the order they are done:

1. **Red:** release the few cheap beasts the sell search cannot avoid. Only
   shown when there are any.
2. **Green:** the sell search, which now shows keepers only.
3. **Blue:** when ten or more beasts sit exactly on the threshold (worth at
   least the threshold and less than one chaos more), they get a search of
   their own, to bulk sell at one price.

## How a search is built

The in game search is a real, case insensitive regex engine: `|`, `.`, `^`,
`$`, groups, `[^x]` and `(?!...)` work, `!` and quotes do not, and `.` stops at
a line break. It is not row oriented: every line of a row is matched on its own
and the row is shown if any one line matches. A pattern is therefore an
alternation of short name fragments:

```
wine.r|rric.g|cic.sa|rric.f|umal.s|wine.c|rric.w|rric.l|wine.v|icic.m|rric.m
```

Each fragment is chosen so that it appears in **no** beast outside the
selection. Picking the smallest such set is set cover, so
`src/lib/bestiary-regex.ts` uses the greedy approximation: take the fragment
covering the most still uncovered beasts, repeat, then pack the fragments into
searches of at most 249 characters. What does not fit goes into the next
search; a pattern is never truncated.

### What the search reads is more than the name

A Bestiary row is several lines, and all of them are searched: the beast type
name, its genus, family and habitat, the name the game generated for that
capture, and every modifier it rolled, names and descriptions alike. So three
corpora are off limits to fragments:

| Corpus | Size | Refreshed by |
| --- | --- | --- |
| Bestiary modifiers, names and effects | 28 | `pnpm mods:update` |
| Generic rare monster modifiers | 224 | `pnpm mods:monsters` |
| Words a generated name can be built from | 35,237 combinations | `pnpm words:update` |
| Lines seen in game that neither scrape knows | 3 | `src/lib/observed-mods.ts`, by hand |

No list of modifier text is ever complete, so length carries the rest: an
unanchored fragment must be at least six characters. Anchored fragments
(`^wild.hel`) may be shorter, because `^` binds to the start of a line. A
literal space is never emitted; word breaks travel as `.`.

### The full line form

`^goatman$` pins a whole line, which no generated name and no modifier will
ever equal. It is the only way to separate a beast whose name sits inside
another's, such as Goatman inside Goatman Fire-raiser, so the solver reaches
for it last. Negation cannot help: a row is shown when any line matches, and a
modifier line that lacks the term always satisfies a lookahead.

`matchesBestiaryPattern()` implements this reading, and the tests measure the
generator against it rather than against `RegExp.test`.

## Where the planning happens

Most of the planning cost was one question: can this fragment sit inside any of
the 35,237 generated names? Every form of it is a membership test, so the
answers are precomputed into sets once. A single plan takes 50 to 550 ms.

That is fast enough for the browser. A threshold that is not a preset is planned
in a Web Worker so the field keeps typing smoothly, and the result is remembered
for the session. The five preset thresholds are planned on the server and
shipped with the page. Those plans are cached on the **split** (which beasts
fall either side of 1, 2, 3, 4 and 5 chaos) rather than on the prices, so most
price refreshes cost nothing.

## Prices

| Source | Gives | Refresh |
| --- | --- | --- |
| [poe.ninja economy API](https://poe.ninja/docs/api) | prices, genus, family, habitat for the beasts with live listings | 15 minute data cache |
| `pathofexile.com/api/trade/data/items` | the full roster of beast names | daily |
| `pathofexile.com/api/trade/search` | prices for the beasts poe.ninja does not list | daily cron, a slice at a time |

poe.ninja only lists beasts somebody is selling. The rest are asked of the
trade site, the same fallback Awakened PoE Trade uses. Almost none of them have
a listing anywhere, which means the game no longer hands them out. They are
labelled "not found" and left out of every pattern.

The trade API allows 5 requests per 10 seconds and 30 per 300 seconds, and
breaking the latter locks the IP out for half an hour. So no page render ever
touches it:

- **`/api/refresh-prices`** runs on a Vercel cron once a day (`vercel.json`).
  Each run walks ten names 5 seconds apart, chosen from the date, so no state
  is carried between runs. Set `CRON_SECRET` to lock the route; tune with
  `PRICE_REFRESH_SLICE` and `PRICE_REFRESH_SPACING_MS`.
- **`src/lib/trade-prices.fallback.json`** is a committed snapshot served while
  the cache is cold. Regenerate it with `pnpm prices:snapshot`. It paces
  itself, resumes where it stopped and takes about an hour.

The trade query must not use `status: "online"`, which returned zero listings
for every beast. The snapshot uses `any`, and the script aborts if even the
most listed beast comes back empty.

## Rendering

`/beasts/[league]` is rendered per visit so the numbers are current. That is
affordable because the fetches sit behind a 15 minute data cache and the
pattern planning for custom thresholds runs in the browser.

## Bestiary Sim

`/beasts/<league>/simulation` is unfinished, `noindex` and in no menu. It rolls
every listed beast into a capture the way the game does (a generated name, its
Bestiary modifiers, a few monster modifiers) and lets a pattern be tried
against all of them with prices on screen, so an expensive beast in a trash
pattern shows up before it is released.
