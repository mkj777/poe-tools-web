# Scarab Nodes

Live at <https://www.pathoftools.app/scarabs>, which redirects to the current
league, for example `/scarabs/standard`.

Scarab Nodes prices the Path of Exile Atlas passives that concern one family of
scarabs, so the spare points on an Atlas tree go where they are worth the most.

## What the page shows

Two lists of cards, side by side on a wide screen:

- **Turn content off.** The twelve notables that say your maps have no chance
  to contain one mechanic. Eleven of them also say the scarabs found in your
  maps cannot be that mechanic's, so taking one stops its family from dropping.
  The twelfth, Straight and Narrow, turns off Smuggler's Caches, which have no
  scarabs, so it costs nothing. Ranked **cheapest first**: the top card is the
  content you give up the least scarab value by disabling.
- **Double drop chance.** The nine Carapace notables, each giving scarabs
  dropped in your maps a 100% increased chance to be of one family. Ranked
  **dearest first**: the top card is the family whose next drop is worth the
  most.

Each card shows the notable's Atlas art, its effect, the ranking value, and
every scarab of the family with its price and its share of the family's drops,
drawn as a bar behind the row.

Several notables are not named after the family they touch (Tainted Carapaces
is Beyond, Possessed is Torment, Trapping is Ambush, Outcasted is Anarchy,
Devoted is Domination), which is why the mapping is a table in
`src/lib/scarab-nodes.ts` rather than a string match. Every name and line in it
was read from GGG's published Atlas tree export at 3.29 and checked against the
wiki.

## The ranking value

One number per card: **what the next scarab of this family is worth**. Each
scarab's poe.ninja currency exchange price is weighted by how often its rarity
tier drops (`expectedValue()` in `src/lib/scarab-nodes.ts`).

The sum, the average and the dearest single scarab were tried and dropped: each
counts a scarab nobody ever sees for as much as one that drops every other map.
Ultimatum holds the most expensive scarab in the game and still ranks low,
because that scarab sits at the rarest tier.

A scarab with no known tier weighs nothing rather than being counted as common.
If no scarab of a family has a tier, the flat mean stands in. A family the
exchange has no price for at all is dropped from the list, rather than shown at
zero, where it would read as the cheapest content to give up.

## Drop weights

The game sorts scarabs into five internal rarity tiers: common, uncommon, rare,
mythic and extreme. GGG has never published a number for them. The ratios used
here are medians from the one public measurement: about thirty three thousand
vendor recipes collected by a player in 3.27 and linked from the wiki, a recipe
rolling on the same weights a drop does. Roughly, any single common scarab is
one in sixty of the scarabs you find, an uncommon one in ninety, a rare one in
a hundred and seventy, a mythic one in fifteen hundred.

Which tier each scarab belongs to lives in `src/lib/scarab-tiers.ts`, written
by `pnpm scarabs:tiers` from the wiki's item data.

## Data and refresh

| What | Source | Refresh |
| --- | --- | --- |
| Scarab prices | poe.ninja currency exchange overview | 15 minutes (ISR) |
| Scarab tiers | poewiki item data, `pnpm scarabs:tiers` | by hand, per patch |
| Atlas passive art | GGG Atlas tree export plus wiki PNGs, `pnpm atlas:icons` | by hand, per patch |

The pages are prerendered per league and revalidated every 15 minutes. The
component ships no JavaScript of its own.

Source: `src/app/scarabs/[league]/page.tsx`, `src/components/scarab-nodes.tsx`,
`src/lib/scarab-nodes.ts`, `src/lib/scarab-tiers.ts`,
`test/scarab-nodes.test.ts`.
