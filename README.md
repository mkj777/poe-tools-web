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

Prices come from the [poe.ninja economy API](https://poe.ninja/docs/api)
(`/poe1/api/economy/...`). Requests happen server-side with a descriptive
User-Agent and are cached for 15 minutes, which is roughly how often poe.ninja
refreshes PoE 1 overviews.

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
pnpm dev      # http://localhost:3000
pnpm test     # regex tests against a real 218-beast fixture
pnpm build
```

Tests run on `node --test` with Node's built-in TypeScript stripping — no test
framework needed. They assert the generated pattern never misses a wanted beast
at several thresholds, and that every false positive is one the caller was
warned about.

## Stack

Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, TypeScript.
