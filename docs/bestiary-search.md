# How the Bestiary search actually behaves

A running log of every in-game test and what it rules in or out. The generator
in `src/lib/bestiary-regex.ts` is built against the model at the bottom, so this
file is the reason the code looks the way it does. **Append, never rewrite** —
a result that later turns out misleading is still evidence.

Status legend: ✅ confirmed · ❓ open · ❌ ruled out

---

## Current model

A **real regex engine, applied per line**. Each line of a row is matched on its
own and the row is shown if any single line matches.

| Property | Status | Evidence |
| --- | --- | --- |
| Matching is per line, row shown on any hit | ✅ | Tests 7, 12, 16 |
| Matching is plain substring, not subsequence | ✅ | Test 8 |
| A space in the query behaves as `.`, not as itself | ✅ | Test 16 spaces |
| `.` behaves as a wildcard | ✅ | Every pattern using `.` has worked |
| `.` does **not** cross a line break | ✅ | Test 16 I |
| `\|` alternation works | ✅ | Every generated pattern relies on it |
| Groups `( )` | ✅ | Test 16 A |
| Negated character classes `[^x]` | ✅ | Test 16 B |
| Quantifiers `.*` | ✅ | Test 16 D |
| `$` anchors, per line | ✅ | Test 16 C2, H1 |
| Full-line `^name$` | ✅ | Test 16 H2 |
| Negative lookahead `(?!…)` | ✅ parsed **and** applied | Test 16 F1, F2 |
| Row-level negation | ❌ impossible | Test 16 — per-line OR defeats any lookahead |
| `!` negation | ❌ | Test 4 — and `!` is not regex syntax at all |
| `"quotes"` as exact match | ❌ | Test 16 G |
| Field limit is 249 characters | ✅ | In-game testing; 250 truncates |
| **Searched:** beast type name | ✅ | Every working pattern |
| **Searched:** genus and family | ✅ | Test 9 |
| **Searched:** modifier names and descriptions | ✅ | Tests 7, 10 |
| **Searched:** the generated per-capture name | ✅ | Test 10 |
| **Searched:** modifier descriptions, not just their names | ✅ | Test 13 |
| **Searched:** generic rare monster mods, not only Bestiary ones | ✅ | Test 14 |
| **Searched:** text we still cannot enumerate | ⚠️ | Test 14 — a pattern matched a row none of its known strings explain |
| `^` anchors, per line | ✅ | Test 12 |

### Precision is the goal, not brevity

The generator no longer trades accuracy for length. A fragment that matches
anything outside the selection is never used; when the surviving fragments do
not fit in 249 characters they are split across several searches, run one after
another. Whatever no fragment can reach is named rather than swept in.

### What the generator does with that

1. Fragments are cut from the beast type name, since that is what identifies it.
2. Each fragment is offered in two forms: free-floating, and **anchored** with
   `^` to the start of a line. The anchor costs one character and rules out
   every mid-word collision, so it usually wins.
3. A fragment is rejected if it appears in **any** modifier name or description
   (`src/lib/bestiary-mods.ts`, 28 entries). Those ride along on any beast, so
   such a fragment matches at random — `far` catches every beast holding
   "Farric Presence".
4. A fragment is rejected if it could occur inside a **generated name**
   (`src/lib/monster-words.ts`) — inside a prefix word, a suffix word, a title,
   or across the seam where they are glued together.
5. A fragment is rejected if it hits any line of an unwanted beast — name,
   genus, family, habitat — as a substring, or as a line prefix when anchored.
6. Word breaks are emitted as `.`, never as a literal space.
7. If nothing fits 249 characters, the pattern is refused rather than truncated.

Anchors changed the picture completely. Before them, every large selection was
refused; now all of them build, and they survive the name-pool ban too:

| Threshold | Keep | Reverse |
| --- | --- | --- |
| 1c | 228 chars, 13 false positives | 83 chars, **0** |
| 4c | 144 chars, 3 | 216 chars, 22 |
| 20c | 78 chars, 4 | 143 chars, 12 |
| 150c | 25 chars, 4 | 74 chars, 5 |

Banning the name pool costs roughly 20 characters and pushes the solver towards
fragments that span a word break — `cic.c`, `mal.pl`, `ild.h`. That is exactly
right: prefix and suffix words are single words, so nothing spanning a space can
ever sit inside a generated name.

The four at 150c are the Parasite variants, and they are honest: their **genus
line reads "Parasites"**, so `^parasite` matches it. No pattern can separate a
beast from a genus that starts with its name.

**Closed:** the generated names are checked too. See the `Words.dat` section
below — the pool turned out to be 167 prefixes and 211 suffixes, so all 35,237
possible names are known and a fragment that could land inside one is refused.

---

## Test log

### Test 1 — literal spaces
**Pattern:** `k m|l p|parasite` (150c threshold, old generator)
**Expected under substring-on-name:** Black Mórrigan, Fenumal Plagued Arachnid, Parasite + 4 Parasite variants
**Observed:** also **Sulphuric Scorpion** and **Scum Crawler**

Neither shares a substring with the pattern. `su`**`lp`**`huric` matches `l p`
only if the space is dropped or treated as a separator.

→ Space is not a literal character. Word breaks are emitted as `.` from here on.

### Test 2 — first counter-example to substring matching
**Pattern:** `fir|rav|bac|d.vu|mal.c|k.m|l.p|ris|cry|tig|rot|sto|ld.h|d.sc|us.h|cic.c|nd.sk|red.c|parasite` (4c)
**Observed extras:** **Farric Ursa**, **Farric Lynx Alpha**

Neither shares a substring with any fragment. Both fall out of subsequences of
the name alone:

- `ris` → fa**r**r**i**c ur**s**a
- `fir` → **f**arr**i**c u**r**sa
- `l.p` → farric **l**ynx a**l****p**ha

→ First evidence for subsequence matching. The model at this point was
"subsequence over the name"; Test 5 widened it to the whole row.

### Test 3 — beasts the pattern never shows
**Reported missing:** Grimsucker, Sharptooth, Grayshriek, Deathclaw the Mad,
Darkslice, Gloomfang

Checked against all three catalogues:

| Catalogue | Count | Contains any of them |
| --- | --- | --- |
| poe.ninja priced | 218 | no |
| GGG `api/trade/data/items` → Itemised Monsters | 361 | no |
| Awakened PoE Trade `CAPTURED_BEAST` | 220 | no |

APT's 220 is a strict subset of GGG's 361; poe.ninja's 218 likewise. So GGG's
list is the complete catalogue of *itemisable* beasts, and none of the six is in
it. Their name morphology (Grim+sucker, Death+claw "the Mad") is that of
procedurally generated rare monster names, which the game composes per capture.

→ No catalogue can contain them. Not a generator bug. (Gloomfang is also the
name of a unique amulet, unrelated.)

### Test 4 — negation
**Search:** `!parasite`
**Observed:** does not work.

→ The trash pattern cannot be expressed as "everything except the keep pattern".
It has to be enumerated.

### Test 5 — `ris` (the decisive one)
**Search:** `ris`
**Observed:** Wild Bristle Matron, Farric Goliath, Craicic Savage Crab,
Chrome-touched Croaker, Craicic Maw
*(the user does not own every beast, so this is a subset of all true matches)*

| Beast | Row text | substring on name | subsequence on name | subsequence on row text |
| --- | --- | --- | --- | --- |
| Wild Bristle Matron | Gargantuans, Ursae, The Wilds | ✅ | ✅ | ✅ |
| Farric Goliath | Goliaths, Unnaturals, The Wilds | ❌ | ❌ (no `s` in the name) | ✅ |
| Craicic Savage Crab | Crabs, Crustaceans, The Deep | ❌ | ✅ | ✅ |
| Chrome-touched Croaker | Gem Frogs, Amphibians, The Deep | ❌ | ❌ (no `i`, no `s`) | ✅ |
| Craicic Maw | Maws, Amphibians, The Deep | ❌ | ❌ (no `s`) | ✅ |

5 of 5 explained by subsequence over the row text, and by nothing weaker.
Plain substring on the name explains 1 of 5.

→ Two conclusions at once: matching is subsequence-based, **and** genus /
family / habitat are searched alongside the name.

Scale check: `ris` is a subsequence of the row text of **188 of 218** priced
beasts. Seeing only 5 is consistent with a partly filled Bestiary.

### Test 6 — `km` (unexplained)
**Search:** `km`
**Observed:** Farric Gargantuan

Row text is "farric gargantuan gargantuans ursae the wilds". It contains
**neither `k` nor `m`**. Every model tried fails:

| Model | Farric Gargantuan matches `km`? |
| --- | --- |
| substring on name | ❌ |
| substring on row text | ❌ |
| subsequence on name | ❌ |
| subsequence on row text | ❌ |
| space-stripped | ❌ |
| any-character-of-query | ❌ |
| Levenshtein ≤ 1 over any 2-char window | ❌ |

`km` is a subsequence of the row text of 8 of 218 priced beasts, and Farric
Gargantuan is not among them.

→ Some searched text is still unaccounted for. Candidates: the beast's
modifiers, the Beastcrafting recipes it is a component of, or an internal id.
Also worth re-checking that the field was empty before typing.

### Test 7 — `far` and `^far`
**Observed:** both appear to return the same set, and it includes beasts whose
type name has nothing to do with "far" — they carry the modifier
**Farric Presence**.

→ Modifier names are searched. `^` is untestable this way: the modifier line
itself starts with "Far", so an anchored search would match it too.

### Test 8 — `wldbrstl` (subsequence ruled out)
**Observed:** nothing. Not even Wild Bristle Matron.

→ The search does not skip characters. **Subsequence matching is dead**, and
with it the conclusions drawn in Tests 2, 5 and 6. Those hits came from
substrings of text the row shows besides the type name.

### Test 9 — `ursae`
**Observed:** every beast of the Ursae family, none of which has "ursae" in its
name.

→ Family is searched directly. Confirms the row-text part of Test 5 by a much
cleaner route.

### Test 10 — `km` explained
**Observed:** two beasts, both **Darkmauler** — an Ursae, type Farric
Gargantuan, each carrying Farric Presence, Fertile Presence and Satyr Storm.

Dar**km**auler. A plain substring of the generated name.

→ Test 6's anomaly is closed. The generated per-capture name is searched, and
nothing exotic is going on.

### Test 11 — what a Bestiary row actually contains
From inspecting captured beasts:

| Generated name | Type | Modifiers | Description text |
| --- | --- | --- | --- |
| Darkmauler | Farric Gargantuan (Ursae) | Farric Presence, Fertile Presence, Satyr Storm | — |
| Stonegrowl | Farric Lynx Alpha | Fertile Presence, Aspect of the Hellion, Spectral Swipe | extra chaos damage, energy shield aura, lightning mirage when hit, 10% chance not to be consumed at the Blood Altar |
| Whiteback | Farric Frost Hellion Alpha | Spectral Swipe, Farric Presence, Satyr Storm | periodically enrages, exploding crystals when hit, leeches life |

So one row carries: generated name, type name, genus, family, up to three
modifier names, and their descriptions. Free-text search reads all of it.

Note that modifier names are not tied to a type — Farric Presence appears on a
Gargantuan and on a Frost Hellion Alpha alike.

### Test 12 — `^` anchors work
**Searches:** `resence` → the Presence modifiers. `^resence` → **nothing**.

→ `^` is a real anchor, and Test 7 showed it binds per line rather than to the
whole row: `^far` still returned beasts whose first line is a generated name,
because a later line ("Farric Presence", or the type name) starts with "Far".

This is the single most valuable thing learned. Every fragment now gets offered
in an anchored form for one extra character.

### Test 13 — modifier descriptions are searched
**Search:** `chaos damage`
**Observed:** Stonegrowl and every other beast with chaos damage.

→ Not just modifier names — their descriptions too. The ban list already
carries both.

### Test 14 — a false positive the model did not predict

**Search** (trash, threshold 2c, step 1 of 1):

```
cic.s|ric.g|wine.r|ric.f|umal.s|wine.c|rar|c.va|c.wo|c.ly|e.vu|ex.m|ne.b|mal.h|mal.d|cic.m|c.pit|ic.ap|c.mag|cic.w|mal.q|c.tau|mal.w|c.chi|rric.u
```

**Observed:** Wild Hellion Alpha — worth 50c, so squarely in the keep set —
came back. Its row showed Stonemaul, Aspect of the Hellion, Satyr Storm,
Spectral Swipe, Soul Eater, Life cannot be leeched.

Checked every fragment against every string of that row — name, genus, family,
habitat, all six modifier names, and the descriptions we hold for the three
Bestiary ones. **None of them matches**, under substring, under subsequence,
under a `.`-as-glob reading, and against the row concatenated into one string.
So the matching text is something the row carries that is not written down
here — almost certainly the description of one of the modifiers we have no
text for.

Two of those, Soul Eater and Life cannot be leeched, are not Bestiary
modifiers at all: they are ordinary rare monster mods. That was the gap. The
ban list held 28 Bestiary modifiers and nothing else, while a captured beast
also rolls from the generic monster pool, which the wiki lists as 224 mods with
their effect text — `rar` alone sits inside "Rare pack minions are replaced
with Saplings" and "Rare Minions create Frost Beacons on Death".

**Changed as a result:**

- `src/lib/monster-mods.ts` (352 lines, `pnpm mods:monsters`) joins the ban
  list, so no fragment may appear in generic monster modifier text either.
- Unanchored fragments must now be at least **6 characters**. No list of
  modifier text can ever be complete, and a three-character fragment like `rar`
  is a coin flip against English prose. Anchored fragments may stay short —
  they only ever meet the start of a line.
- Cost, measured on the 218-beast fixture: trash at 4c goes from 3 searches to
  4. Nothing else moves.

### Test 15 — the tooltip, and what actually leaked

Four in-game screenshots of captured beasts settled the shape of a row:

```
Greyscreech                        ← the generated name, and all the grid shows
- Farric Flame Hellion Alpha -     ← the type, only in the tooltip
Level: 83
Farric Presence                    ← Bestiary modifiers, in red
Tiger Prey
Fertile Presence
Soul Eater                         ← ordinary monster modifiers, in white
Extra Fire Damage and Exposure
```

Three things follow.

**Modifier names, not descriptions.** The tooltip prints one short line per
modifier — "Extra Fire Damage and Exposure", "Periodically Enrages", "Shocked
Ground on Death". That revises Test 13: `chaos damage` did not match a
description, it matched the modifier *named* "Extra Chaos Damage". Which means
the searchable text is enumerable after all, and small: 24 Bestiary modifier
names and 111 monster ones.

**And that is the leak.** `rar` is inside **Tempo*rar*ily Revives**, an
ordinary rare monster modifier. Any beast can roll it, so `rar` could show any
beast in the league — which is exactly what Wild Hellion Alpha was doing in a
2c trash pattern. The user's list of that row's modifiers did not include it,
but the row had more lines than were quoted.

**Red beasts carry three Bestiary modifiers, yellow ones carry one**, matching
the wiki's note. Both then carry a few ordinary ones, and a beast that survived
the altar keeps "10% chance not to be consumed when sacrificed at the Blood
Altar" as another line.

All of that is now rolled per beast in `/simulation`, and `patternRisks()`
answers the question without rolling: can this fragment land in *any* generated
name or *any* modifier name? A test asserts the planner never emits one that
can, at every threshold and in both modes.

### Test 16 — it is a real regex engine

Test 4 had `!parasite` doing nothing, and that was read as "no negation". Wrong
read: `!` is item-filter syntax, not regex, so its failure said nothing about
the dialect. Meanwhile `.`, `|` and a per-line `^` are exactly a regex engine in
multiline mode. So the whole dialect was probed properly, each probe paired with
a control that had to match — an unsupported metacharacter is most likely
treated as a literal, so "nothing came back" alone proves nothing.

| Probe | Control | Result | Conclusion |
| --- | --- | --- | --- |
| `(wild\|craicic)` | `wild\|craicic` | identical | groups are parsed |
| `f[^x]rric` | `f[^a]rric` | farric / empty | negated classes work |
| `wild.*hellion` | `wild.hellion` | both | quantifiers work |
| `alph$` | `alpha` | empty / matches | `$` is a real anchor |
| `goatman$` | — | both goatmen | `$` binds **per line** |
| `^farric.goatman$` | — | Farric Goatman only | full-line matching works |
| `^elder(?!.*zzzz)` | `^elder` | identical, all three | `(?!…)` is parsed, not literal |
| `^elder(?!.*goatman)` | `^elder` | Goatman **gone** | `(?!…)` is applied |
| `ragetusk.*spectral` | `ragetusk`, `spectral` | empty / both match | `.` does not cross a line break |
| `"goatman"` | `goatman` | empty / matches | quotes are literal, no exact-match form |

`\b` was probed too and the probe was worthless: `\bgoatman` *must* return
Goatman Fire-raiser even when `\b` works, because "Goatman" inside it does begin
at a word boundary. Word boundaries cannot separate a name from a longer name
containing it. Line anchors can, which is why H2 is the useful result.

**What this gave the generator.** A third fragment form: the full name with both
anchors. Nothing but an identical line can match it, so it is immune to
generated names and modifier text by construction. Measured on the 218-beast
fixture, it emptied the unreachable list entirely:

| Threshold | Sell extras | Trash searches | Left out, before → after |
| --- | --- | --- | --- |
| 1c | 12 | 1 | 0 → 0 |
| 2c | 24 | 1 | 0 → 0 |
| 4c | 3 → **0** | 4 | 3 → **0** (`^goatman$ ^devourer$ ^plummeting.ursa$`) |
| 20c | 4 → **0** | 4 | 2 → **0** (`^goatman$ ^devourer$`) |

Search counts did not move. The extras at 4c and 20c dropping to zero was not
expected — a collision-proof fragment helps the coverage mode too.

#### Test 16, spaces — and Test 1 finally closed

Test 1 read `l p` matching Sulphuric Scorpion as "the space is dropped", since
`l.p` cannot match "su**lp**huric" — there is no character between the l and the
p. Two probes killed that reading:

- `farric goatman` returns Farric Goatman. Under dropping, "farricgoatman"
  appears nowhere and it would return nothing. **A space is a `.` wildcard.**
- `k m|l p` was run again and twelve of its hits screenshotted. Every single one
  is explained by a space-as-wildcard match inside a **modifier name** or a type
  name — not one needed the "dropped" reading:

| Matched text | Beasts |
| --- | --- |
| "Tempora**l P**roximity Shield" | Agonyguardian, Bluescreech, Wrathback, Shaggysucker, Crimsonraker, Ebonrumble, Ichorband, Shadowshiver |
| "Fenuma**l P**resence" | Crimsongnaw, Cavetusks, **Slenderripper — a Sulphuric Scorpion** |
| "Blac**k M**órrigan" | Shaggyscar |

So Test 1's extras were never a hole in the model: they were modifier hits, the
same mechanism as Test 10's `km` → "Dar**km**auler". Sulphuric Scorpion did not
match on its own name at all.

**Two corpus gaps found in those screenshots.** Checking all 39 modifier lines
they show against both scrapes, 37 were already banned. The misses:

- **"Spikes on Death"** — in neither scrape.
- **the Blood Altar survival line** — it existed in `capture.ts` for the
  simulator to roll, but was never in the ban list. It rides along on any beast
  regardless of type, so a fragment inside it would have been the worst leak
  available.

Both, plus "Stonemaul" from Test 14, now live in `src/lib/observed-mods.ts` —
hand-maintained, because `pnpm mods:update` overwrites the scraped files. A test
asserts no emitted fragment touches them, at four thresholds in both modes.
Plans did not change size, so the ban cost nothing.

**What it did not give.** Negation, despite `(?!…)` working. A row is shown when
*any* line matches, and on a beast whose type line contains the term, the
modifier lines do not — so they satisfy the lookahead and bring the row back.
Row-level exclusion cannot be expressed by a per-line pattern at all, however
good the dialect. `^(?!.*goatman)` returns everything, and that is not a bug in
the engine, it is the line-oriented model. Enumeration stays the only option for
the trash side.

---

## Simulating the window instead of guessing

`/simulation` holds every beast with a listing, with the lines this model says
the search reads, and applies a pasted pattern the way `matchesBestiaryPattern`
does. Each tile shows the price and the fragment that matched, so a probe can
be checked against the model before it is checked against the game — and, more
useful, the two can be compared. Where the simulation shows a beast the game
does not, or the game shows one the simulation does not, the model is wrong and
the difference says where.

Both lines that vary per capture are now rolled: the generated name, from the
`Words.dat` pools, and the modifiers, from the two modifier lists. Reroll draws
again; the risk panel skips the dice and asks whether a fragment could land in
any generated name or any modifier name at all.

What would make it exact rather than close — exports from
[poe-dat-viewer](https://snosme.github.io/poe-dat-viewer/):

| File | What it settles |
| --- | --- |
| `Mods.dat64` (Name, Domain, GenerationType) | every modifier name a beast can roll. The wiki lists 111 and misses some — "Stonemaul" is on a captured beast and on no wiki page |
| `MonsterVarieties.dat64` (Id, Name) | which beast each `BestiaryCapturableMonsters` row is, so the dead ones can be dropped by their own flag instead of by "no listings" |
| `BestiaryGenus.dat64`, `BestiaryFamilies.dat64` | whether genus and family really are searched, and under which spelling |
| `Words.dat64` | already imported, would only be refreshed |

## Open questions, and the probes that would settle them

Run one at a time in the Bestiary search, note everything that appears.

| Probe | Question | How to read it |
| --- | --- | --- |
| `^darkm` | Do anchors work? | Nothing → `^` is literal or unsupported. Darkmauler still showing → `^` binds to the start of *some* line, which is what matters |
| `^resence` vs `resence` | Does `^` actually exclude mid-word matches? | If `^resence` finds nothing while `resence` finds the Presence mods, anchoring is real and usable |
| `wilds` | Is the habitat searched, or only genus and family? | Ursae already confirmed family (Test 9); habitat is still assumed |
| `[kx]m` | Character classes? | Same result as `km` → classes work, and a class would let one fragment cover two beasts cheaply |
| `mauler` | Is the generated name searchable in full? | Confirms Test 10 from the other direction |
| `chaos damage` | Are modifier *descriptions* searched, or only their names? | Stonegrowl showing → descriptions too, which widens the ban list |

Anchors are the prize. `^` would let a fragment bind to the start of the type
name, which would rule out most collisions with generated names and modifier
text in one stroke.

### The generated names — found: `Words.dat`

Grimtooth, Darkmauler, Stonegrowl, Whiteback, Marrowthirst, Razordroll the
Relentless. Not random: PoE composes rare monster names from a fixed word pool
in **`Words.dat`**, whose schema is

```graphql
type Words {
  Wordlist: Wordlists   # which pool this word belongs to
  Text: string @unique  # the word itself
  Text2: string
  ...
}

enum Wordlists {
  ITEM_PREFIX  ITEM_SUFFIX
  MONSTER_PREFIX  MONSTER_SUFFIX  MONSTER_TITLE
  UNIQUE_ITEM  STRONGBOX_PREFIX  STRONGBOX_SUFFIX
  ESSENCE  TEST  VILLAGER_PREFIX  VILLAGER_SUFFIX
  MERCENARY_PREFIX  MERCENARY_SUFFIX
}
```

Source: [poe-tool-dev/dat-schema](https://github.com/poe-tool-dev/dat-schema),
`dat-schema/_Core.gql`. `Dark`+`mauler`, `Stone`+`growl`, `Grim`+`tooth`,
`Razor`+`droll` + `the Relentless` — prefix, suffix and title, exactly.

**Extracted, and now in use.** Export `Data/Words.dat64` from
[poe-dat-viewer](https://snosme.github.io/poe-dat-viewer/) as JSON and run
`node scripts/update-monster-words.mjs <words.json>`. The `Wordlist` column
comes through as the enum index counting from 1, so 3, 4 and 5 are the monster
lists:

| Wordlist | Count | Examples |
| --- | --- | --- |
| 3 MONSTER_PREFIX | 167 | Dark, Stone, Grim, Marrow, White, Razor |
| 4 MONSTER_SUFFIX | 211 | mauler, growl, tooth, thirst, back |
| 5 MONSTER_TITLE | 217 | the Accursed, the Relentless, the Ancient |

167 × 211 = **35,237** possible names, all of them known. A test builds every
one and asserts no generated pattern matches any.

While in there, `BestiaryCapturableMonsters.dat64` is worth exporting too. It
joins to `MonsterVarieties` (the name), `BestiaryGenus` and `BestiaryGroups`,
and unlike GGG's trade data it covers beasts that cannot be itemised at all.

Sources checked that do **not** carry the word pool: poe.ninja, GGG trade data,
Awakened PoE Trade's bundled data, the PoE Wiki cargo tables, and poedb
(`MonsterNames` → 404).

---

## Data sources

| Source | What it gives | Why it is not enough alone |
| --- | --- | --- |
| `poe.ninja/poe1/api/economy/stash/current/item/overview?type=Beast` | 218 beasts **with prices** | Only beasts with live listings |
| `pathofexile.com/api/trade/data/items` → Itemised Monsters | 361 beast **names** | No prices |
| `pathofexile.com/api/trade/search/{league}` | Live listings per beast — this is how the 143 unpriced ones get a value, 0c when nobody sells them | 5 req/10 s, 30 req/300 s. A cron refreshes a slice at a time; `src/lib/trade-prices.fallback.json` covers a cold cache |
| Awakened PoE Trade `renderer/public/data/en/items.ndjson` | 220 `CAPTURED_BEAST` names + icons | Subset of GGG's list, no prices, no genus |
| PoE Wiki `List_of_bestiary_modifiers` + `mods` cargo table | 28 modifier names and descriptions | Committed as `src/lib/bestiary-mods.ts`; refresh with `pnpm mods:update` |

The app uses GGG's 361 as the universe and poe.ninja for prices where it has
them. The other 143 were each searched on the trade site with offline listings
included; **exactly one came back with anything** — Tunnelfiend, 4c, one
listing. Since everything the game drops is being sold by someone, the remaining
142 read as content that no longer drops, which matches the other two signals:
127 of them are absent from Awakened PoE Trade's current-patch data, and
`BestiaryCapturableMonsters` marks 204 of its 480 rows `IsDisabled`.

Those 142 are excluded from the patterns entirely. A beast that cannot be
captured cannot appear in the Bestiary window, so spending pattern length to
avoid it buys nothing.
