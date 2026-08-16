# How the Bestiary search actually behaves

A running log of every in-game test and what it rules in or out. The generator
in `src/lib/bestiary-regex.ts` is built against the model at the bottom, so this
file is the reason the code looks the way it does. **Append, never rewrite** —
a result that later turns out misleading is still evidence.

Status legend: ✅ confirmed · ❓ open · ❌ ruled out

---

## Current model

Matching is **plain case-insensitive substring** — over far more text than the
beast type name.

| Property | Status | Evidence |
| --- | --- | --- |
| Matching is plain substring | ✅ | Test 8 |
| Matching is **not** subsequence | ✅ ruled out | Test 8 |
| A literal space is not a plain character | ✅ | Test 1 |
| `.` behaves as a wildcard | ✅ | Every pattern using `.` has worked |
| `\|` alternation works | ✅ | Every generated pattern relies on it |
| `!` negation | ❌ | Test 4 |
| Field limit is 249 characters | ✅ | In-game testing; 250 truncates |
| **Searched:** beast type name | ✅ | Every working pattern |
| **Searched:** genus and family | ✅ | Test 9 |
| **Searched:** modifier names and descriptions | ✅ | Tests 7, 10 |
| **Searched:** the generated per-capture name | ✅ | Test 10 |
| **Searched:** modifier descriptions, not just their names | ✅ | Test 13 |
| `^` anchors, per line | ✅ | Test 12 |

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

---

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
| `pathofexile.com/api/trade/search/{league}` | Live listings per beast | 5 req/10 s, 30 req/300 s — 143 lookups take ~25 min |
| Awakened PoE Trade `renderer/public/data/en/items.ndjson` | 220 `CAPTURED_BEAST` names + icons | Subset of GGG's list, no prices, no genus |
| PoE Wiki `List_of_bestiary_modifiers` + `mods` cargo table | 28 modifier names and descriptions | Committed as `src/lib/bestiary-mods.ts`; refresh with `pnpm mods:update` |

The app uses GGG's 361 as the universe and poe.ninja for prices. The 143
without a price are held as **unknown**, not trash: no pattern claims them, and
both patterns avoid matching them.
