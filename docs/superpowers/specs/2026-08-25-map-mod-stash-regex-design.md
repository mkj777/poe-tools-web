# Map mod stash regex, design

2026-08-25

## What it is for

Rolling maps in Path of Exile 1 means looking at every rare map and deciding
whether its modifiers are survivable for the current build. The stash search
highlights items, so the decision can be handed to a search string: type it
once, and everything still lit is safe to run while everything dimmed goes back
into the reroll pile.

The tool generates that string from a list of modifiers the player has banned.

## The direction: highlight what is usable

The output highlights maps that are **usable**, not maps that need rerolling.
Two reasons.

Exclusion is expressible. The stash search AND-joins its terms and each term
sees the whole item, so `"!(a|b|c)"` means "contains none of a, b, c" (see
`docs/stash-search.md`, Test 6). Rerolling-side highlighting would be a plain
alternation, which cannot be combined with any other condition later without
turning the whole thing into an OR that the term list cannot express.

White and magic maps fall out correctly for free. They carry no dangerous
modifier text, so no exclusion term touches them and they stay lit. Under
reroll-side highlighting they would stay dark despite also needing to be rolled,
which was the concrete worry that started this design.

## What is deliberately not in it

**Quantity, rarity and pack size thresholds.** Every competing tool leads with
them, and they drag in a numeric layer: turning "at least 30%" into a character
range, rounding to keep the string short, and a slider per axis. Ban lists alone
carry the safety decision, which is the part that costs a map when it is wrong.
Thresholds only cost currency when they are missing.

**A simulator.** The Bestiary tool has one because its engine model was
uncertain for a long time. The stash model is settled enough to build against
(`docs/stash-search.md`). If a probe later contradicts it, a simulator is the
right response then.

**Any sharing with `src/lib/bestiary-regex.ts`.** The two engines are structural
opposites: per line versus whole item, single regex versus term list, no
negation versus negation. Extracting a common core would assert a similarity
that the evidence does not support. The Bestiary tool is not touched by this
work at all.

## The stash search dialect

Established by in-game probing and written up in `docs/stash-search.md`. In
short: whitespace splits the input into AND-joined terms, a term is a real regex
matched against the whole item, `"…"` groups a term containing spaces, and a
leading `!` **inside** the quotes negates that term.

Consequence for the output: because `!(A|B|C)` already means "not A and not B
and not C", the entire result is **one term**, however many modifiers are
banned.

```
"!(horns|o Leech|Temporal|no Life or Mana)"
```

## Components

### `scripts/update-map-mods.mjs` → `src/lib/map-mods.ts`

Run as `pnpm mods:maps`. Same shape as `scripts/update-bestiary-mods.mjs`:
poewiki Cargo, the shared user-agent constant, output committed as a TypeScript
module so the app never fetches at runtime.

Query: table `mods`, `domain=5`, `generation_type` 1 (prefixes) and 2
(suffixes). Three things the raw data does wrong and the script has to fix:

- **`domain=5` is broader than map affixes.** It also carries
  `Vaal Vessel contains … additional Vaal Orbs`,
  `Maven releases all Bosses at once` and
  `Map Boss is accompanied by a Synthesis Boss`, which are area modifiers of
  other origins and never roll on a map. Narrowed by the row's `id`. The script
  prints the count before and after so the filter can be checked rather than
  trusted.
- **Hidden lines.** `Ground Effect has a radius of # (Hidden)` and
  `# patches with Ground Effect per # tiles (Hidden)` appear on no tooltip. What
  is not displayed cannot be searched, so it belongs in neither the targets nor
  the ban corpus.
- **Markup, HTML-escaped.** `Rare Monsters have <span class="keyword">Elemental
  Thorns</span> reflecting # Elemental Damage` arrives with its angle brackets
  escaped as `&lt;`/`&gt;`, so the entities have to be decoded before tags can
  be stripped, and `&lt;br&gt;` has to be split on first because it is the line
  separator.
- **Wrapped modifiers stay split.** One long modifier arrives as several
  `<br>`-separated pieces (`When a fifth Impale is inflicted on a Player,` then
  `Impales are removed to Reflect their Physical Damage multiplied` then
  `by their remaining Hits …`), and the game wraps it in the tooltip too. The
  pieces are kept as separate lines and never rejoined, so no fragment can span
  a place where the game may put a line break.

Stored per affix: name, whether it is a prefix or a suffix, and its stat lines
with the quantity / rarity / pack size block separated out. That block is kept
too, because every map carries it and so it belongs in the ban corpus, but it is
never a target.

Measured before the `id` filter: 173 affix names, 198 distinct stat lines once
numbers are normalised.

### `src/lib/map-mod-groups.ts`

Hand maintained, not generated. A player does not think in affix names.
`Abhorrent` bundles quantity, rarity, pack size and
`Area is inhabited by Abominations`, of which only the last is worth banning,
and nobody calls `of Impotence` anything other than "no regen".

Each group carries a label in player language and the stat lines it owns.
Presets are a second constant: a name and a list of group ids.

Curating all 177 lines into named groups would be a lot of naming for lines
nobody bans. Instead the curated groups cover the bans that are actually asked
for, and **every line they do not claim stays individually bannable** in the
collapsed section, labelled with its own text. That keeps the short list short
without ever hiding a modifier, and it means a new league's new modifiers appear
on their own rather than needing curation before they can be used.

Two tests keep the file honest:

- No line belongs to two groups, which would make a checkbox ban more than it
  says.
- Every line a group claims still exists in `map-mods.ts`. This is the loud
  break that matters: when the wiki rewords a modifier, the group that referred
  to the old wording fails instead of silently banning nothing.

### `src/lib/map-regex.ts`

The generator. Takes the set of banned groups and returns one search string.

- **Targets:** the stat lines of every banned group.
- **Ban corpus:** the stat lines of every affix that is *not* banned, plus the
  quantity / rarity / pack size block. A fragment landing in there dims a map
  that was fine to run, which is the expensive failure: a usable map goes into
  the reroll pile and is rolled away.
- **Candidates:** substrings of the target lines. No digits, because the same
  line carries a different number on every map tier. A minimum length, so a
  short fragment does not collide with English prose by accident.
- **Word breaks:** literal spaces, not `.`. Both are one character and both are
  legal inside a quoted term, but `.` matches any character while a space
  matches only a space. The Bestiary emits `.` because its field has no quoting;
  here precision costs nothing.
- **Selection:** greedy set cover. One fragment may cover several banned groups.
  `flect` covers elemental thorns, physical thorns, the impale reflect line and
  `Monsters Reflect Hexes` in one go; `horns` covers only the two thorns lines.
  Which is legal depends on what the user banned, and that is the whole point of
  computing it rather than curating it.
- **Output:** a single term, `"!(a|b|c)"`.

No worker. The Bestiary solver needs one because it weighs fragments against
35,237 generated names; this one has under two hundred short lines and runs
synchronously in the render.

**Splitting into several searches is not possible here**, unlike in the
Bestiary. There, several searches are run one after another and their results
add up. Exclusion does not add up: a second search replaces the first, so
`"!(a|b)"` followed by `"!(c|d)"` ends on a screen that still shows every map
carrying `a`. The output has to fit one field or it is not usable at all.

The field's length limit is not yet known (the Bestiary cuts at 249). The
generator therefore reports the length it produced and lets the interface show
it, rather than splitting. The probe that settles the real limit is listed in
`docs/stash-search.md`; if a limit turns out to exist, the answer is to warn and
ask for fewer bans, not to split.

### `src/app/[league]/maps/page.tsx` and `src/components/map-regex.tsx`

A new entry in `TOOLS` in `src/lib/nav.ts`, so the tab bar and the league
switcher pick it up unchanged. Map modifiers do not depend on the league, but
the route keeps the shape `activeTool()` and `swapLeague()` already expect, and
diverging from it would cost more than the redundant segment does.

The component is a client component: preset buttons on top, the short list of
checkboxes below them, the remaining groups in a collapsed section under that,
and the generated term at the bottom with a copy button. Selecting a preset
ticks its groups and leaves them individually adjustable afterwards.

`radix-ui` and the shadcn primitives are already in the project;
`src/components/ui/checkbox.tsx` is missing and is added.

## Testing

- `test/map-regex.test.ts`: **no emitted fragment matches a stat line of an
  affix that was not banned.** Asserted for every group on its own and for every
  preset. This is the same promise `test/bestiary-regex.test.ts` makes, with its
  own corpus and its own code.
- No stat line belongs to two groups, and every line a group claims still
  exists in the scraped data.
- The output parses as the term form the dialect requires: one quoted term, `!`
  inside the quotes, no digits in any fragment.

## Documentation

`docs/stash-search.md` already exists and holds the probe log the model is built
on, in the same append-only form as `docs/bestiary-search.md`. It carries the
open questions too, of which one is load bearing: whether the
`Travel to a Map of this tier or lower …` description is searched. If it is,
every word of it rides along on every map and has to join the ban corpus.
