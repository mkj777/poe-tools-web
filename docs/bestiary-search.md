# How the Bestiary search actually behaves

A running log of every in-game test and what it rules in or out. The generator
in `src/lib/bestiary-regex.ts` is built against the model at the bottom, so this
file is the reason the code looks the way it does. **Append, never rewrite** —
a result that later turns out misleading is still evidence.

Status legend: ✅ confirmed · ❓ open · ❌ ruled out

---

## Current model

| Property | Status | Evidence |
| --- | --- | --- |
| A literal space is not a plain character | ✅ | Test 1 |
| `.` behaves as a wildcard | ✅ | Test 6, and every pattern using `.` has worked since |
| `\|` alternation works | ✅ | Every generated pattern relies on it |
| Matching is **not** plain substring | ✅ | Tests 2, 5, 6 |
| Matching includes **subsequences** (characters in order, gaps allowed) | ✅ | Test 5 |
| The searched text includes **genus, family and habitat**, not just the name | ✅ | Test 5 |
| `!` negation | ❌ | Test 4 |
| Field limit is 249 characters | ✅ | Stated by the user after in-game testing; 250 truncates |
| Something beyond name+genus+family+habitat is searched | ❓ | Test 6 — unexplained |

The generator therefore treats a fragment as unsafe if it matches an unwanted
beast's **row text** (name + genus + family + habitat) *either* as a substring
*or* as a subsequence, and never emits a literal space.

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

---

## Open questions, and the probes that would settle them

Run one at a time in the Bestiary search, note everything that appears.

| Probe | Question | How to read it |
| --- | --- | --- |
| `km` again, field cleared first | Is Test 6 reproducible? | If Farric Gargantuan does not come back, Test 6 was an artefact |
| `k` | Does a single letter absent from the row text still match? | If Farric Gargantuan shows, matching is not character-based at all |
| `ursae` | Is the *family* searched directly? | All Ursae beasts appearing confirms it — a stronger form of Test 5 |
| `wilds` | Is the *habitat* searched? | Same idea for the third field |
| `wldbrstl` | Subsequence, cleanly | Matches Wild Bristle Matron only as a subsequence; nothing as a substring |
| `^far` | Are anchors supported? | Only Farric beasts → `^` works and would sharpen every fragment |
| `[kx]m` | Are character classes supported? | Same result as `km` → classes work |
| `craicic maw` (with the space) | Is a literal space usable when it sits inside a phrase? | Test 1 suggests no |

Anchors are the most valuable of these: `^` would let fragments bind to the
start of a name and cut the false-positive rate sharply.

---

## Data sources

| Source | What it gives | Why it is not enough alone |
| --- | --- | --- |
| `poe.ninja/poe1/api/economy/stash/current/item/overview?type=Beast` | 218 beasts **with prices** | Only beasts with live listings |
| `pathofexile.com/api/trade/data/items` → Itemised Monsters | 361 beast **names** | No prices |
| `pathofexile.com/api/trade/search/{league}` | Live listings per beast | 5 req/10 s, 30 req/300 s — 143 lookups take ~25 min |
| Awakened PoE Trade `renderer/public/data/en/items.ndjson` | 220 `CAPTURED_BEAST` names + icons | Subset of GGG's list, no prices, no genus |

The app uses GGG's 361 as the universe and poe.ninja for prices. The 143
without a price are held as **unknown**, not trash: no pattern claims them, and
both patterns avoid matching them.
