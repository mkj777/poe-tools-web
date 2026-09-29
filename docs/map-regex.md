# Map Regex

Live at <https://www.pathoftools.app/maps>, which redirects to the current
league, for example `/maps/standard`. The page is unlisted: it answers, it is
in the sitemap and in `/llms.txt`, and it is in no menu and on no card.

Map Regex writes the Path of Exile 1 stash search that lights up the maps you
can run and leaves the rest dark. The in game testing it is built on is logged
in [stash-search.md](stash-search.md).

## What the page does

- Offers every map modifier in named groups, plus a search over all of them in
  the game's own wording. Tick the ones your build cannot run.
- Builds one search that excludes all ticked modifiers, as a single negated
  term such as `"!(a|b|c)"`, cut from fragments of at least four letters that
  match nothing else a map shows.
- Adds optional minimums for Item Quantity, Item Rarity and Monster Pack Size to
  the same search.
- A "Leave white maps dark" checkbox asks for at least 1% quantity, which an
  unrolled white map does not print.
- Names any modifier no fragment can single out without hiding maps you can
  run.
- A side panel shows current scarab and astrolabe prices and the divine rate
  for the league.

The modifier list does not change between leagues; only the prices beside it
do, which is the only reason the URL carries a league.

## Why it works differently from the Bestiary

The stash search splits its input on whitespace into terms and ANDs them. Each
term is a regex tried line by line, a quoted term may contain spaces, and a `!`
inside the quotes negates the term, meaning no line of the item matches it. The
Bestiary field has no term level, so exclusion is impossible there and easy
here. A search cannot be split in two: a second search replaces the first
rather than narrowing it.

Source: `src/app/maps/[league]/page.tsx`, `src/components/map-search.tsx`,
`src/components/map-setup.tsx`, `src/lib/map-regex.ts`,
`src/lib/map-mod-groups.ts`, `src/lib/map-mods.ts` (written by
`pnpm mods:maps`).
