# How the PoE 1 stash search actually behaves

A running log of every in-game test and what it rules in or out. The generator
in `src/lib/map-regex.ts` is built against the model at the bottom, so this file
is the reason the code looks the way it does. **Append, never rewrite**: a
result that later turns out misleading is still evidence.

This is a **different engine** from the Bestiary search. Do not carry
conclusions across. `docs/bestiary-search.md` is the log for that one, and the
two disagree on nearly every point that matters.

Status legend: ✅ confirmed · ❓ open · ❌ ruled out

---

## Current model

A **list of terms**, split on whitespace, joined by AND. Each term is a real
regex tried **line by line**, and satisfied when any one line matches. A term
wrapped in `"…"` may contain spaces. A term beginning with `!` is negated, which
at term level means "no line matches this".

| Property | Status | Evidence |
| --- | --- | --- |
| Whitespace splits the input into terms | ✅ | Test 1 |
| Terms are AND-joined over the item | ✅ | Test 1 |
| Two terms may match on two **different** lines | ✅ | Test 1 |
| One term may **not** span two lines | ✅ | Test 7 |
| `"…"` groups a term containing spaces | ✅ | Test 4 |
| `!` negates, and only its own term | ✅ | Tests 3, 6 |
| `!` belongs **inside** the quotes | ✅ | Test 6, where `!"…"` matched nothing |
| `.` is a wildcard | ✅ | Test 5 |
| Groups `( )` and alternation `\|` | ✅ | Test 6 |
| **Searched:** modifier text | ✅ | Every test |
| **Searched:** the property block (Item Quantity and friends) | ✅ | Test 8 |
| **Rarity keyword** (`magic`, `rare`, `normal`) | ❌ | Test 8 |
| **Searched:** item name, base type, item level | ❓ | Not probed |
| **Searched:** the "Travel to a Map of this tier" description | ❓ | Not probed, and it matters |
| Field length limit | ❓ | Not probed |
| `^` and `$`, and what they anchor to | ❓ | Not probed |

### It is the Bestiary engine, in a different wrapper

Per line, satisfied by any one line: that is exactly what
`docs/bestiary-search.md` describes. The stash adds two things on top, and only
those two, but they change everything a generator can do:

- **Terms.** Whitespace splits the input, and the results are ANDed. The
  Bestiary field is one term and has no way to say "and".
- **Negation at term level.** `!term` means "no line of this item matches",
  which is a statement about the item, not about a line.

That second point is why exclusion works here and cannot work in the Bestiary. A
per-line `(?!…)` is always satisfied by some other line, so the row comes back
regardless; there is no term level to hang the negation on. Here there is, so
`!(A|B)` really does mean "this item shows neither A nor B".

**What it costs:** nothing a term can express may cross a line break. Counting
how many modifiers an item carries is therefore impossible, and so is any
condition relating one modifier to another.

### What the generator does with that

Because `!(A|B|C)` is one term meaning "not A and not B and not C", the whole
output is **a single term**, however many modifiers are banned:

```
"!(horns|o Leech|Temporal|no Life or Mana)"
```

1. Fragments are cut from the stat lines of the banned modifier groups.
2. A fragment may not contain a digit. The same line carries a different number
   on every map tier, so a digit would bind the fragment to one tier.
3. A fragment is rejected if it appears in the stat text of any modifier that is
   **not** banned, or in the quantity / rarity / pack size block every map
   carries. Such a fragment dims a map that was fine to run, which is the
   expensive failure: a usable map ends up in the reroll pile.
4. Word breaks stay **literal spaces**, not `.`. Both cost one character and
   both are legal inside a quoted term, but `.` matches any character while a
   space matches only a space. The Bestiary has to use `.` because its field has
   no quoting. Here precision is free.
5. Finding the fewest fragments that cover every banned line is set cover, so
   the usual greedy approximation is used. `flect` covers Elemental Thorns,
   Physical Thorns, the Impale reflect line and Monsters Reflect Hexes at once;
   `horns` covers only the two Thorns lines. Which one is legal follows from
   what the user banned.

---

## Test log

### Test 1: whitespace splits terms, and two terms may match on two lines

**Search:** `Monsters Attacks`
**Observed:** among others, **Havoc Direction**, a T16 whose lines are

```
Rare Monsters have Elemental Thorns reflecting 1500 Elemental Damage
Monsters fire 2 additional Projectiles
Monsters Poison on Hit
Unique Boss deals 25% increased Damage
Unique Boss has 30% increased Attack and Cast Speed
Monsters Maim on Hit with Attacks
```

Under a single-regex reading with space as a wildcard, this needs `Monsters`
plus one character plus `Attacks`, adjacent, somewhere. That sequence does not
occur. The match is only explained by two separate terms: `Monsters` hits one
line, `Attacks` hits **another**.

→ Whitespace splits the input into AND-joined terms, and the two terms are
allowed to land on two different lines of the same item.

**Correction, from Test 7.** This was first read as "a term is matched against
the whole item rather than line by line", which is a stronger claim than the
evidence carries and is wrong. What the AND ranges over is the item; what a
single term ranges over is still one line. Test 7 separates the two.

### Test 2: the control that turned out not to discriminate

**Search:** `Monsters' Attacks`
**Observed:** **Iron Intent**, which carries
`Monsters' Attacks have 60% chance to Impale on Hit`. Havoc Direction is gone,
because no line of it puts an apostrophe after "Monsters".

Consistent with the term model (terms `Monsters'` and `Attacks`) and equally
consistent with a wildcard reading (`Monsters'` plus one character plus
`Attacks`). Recorded because it was run as the discriminating probe and was not
one. Test 1 is what settled it.

### Test 3: `!` scopes to its own term

**Search:** `!inhabited zzzz`
**Observed:** nothing.

Under "the `!` negates the rest of the input" this reads `NOT("inhabited
zzzz")`, which is every item. Under "the `!` negates its own term" it reads
`NOT(inhabited) AND zzzz`, and nothing contains `zzzz`.

→ `!` binds to one term.

**This retires an earlier loose observation.** `!inhabited by demons` was
reported as "every map except the Demons ones". Under the settled model it is
`NOT(inhabited) AND by AND demons`, which should show nothing, since "demons"
occurs on maps only inside "Area is inhabited by Demons". The report predates
the model and does not survive it. Worth re-running if it ever matters.

### Test 4: quotes group a term

**Search:** `"Monsters' Attacks"`
**Observed:** Iron Intent.

A quoted term keeps its space, and that space is matched literally.

→ `"…"` is real grouping syntax, and a fragment containing a space is legal as
long as it is quoted.

### Test 5: `.` is a wildcard

**Search:** `Monsters.Poison`
**Observed:** the maps carrying `Monsters Poison on Hit`.

**Broken probe, kept as evidence.** `Monsters.Attacks` was run first and matched
nothing, which was briefly read as "`.` is a literal". It is not. Between
"Monsters" and "Attacks" in `Monsters' Attacks` there are **two** characters, an
apostrophe and a space, and `.` matches exactly one. That probe could not have
matched under either reading. `Monsters Poison on Hit` has a single space, and
is the probe that discriminates.

### Test 6: groups, alternation, and where `!` goes

| Probe | Observed | Conclusion |
| --- | --- | --- |
| `Poison` | maps mentioning Poison | control, matches |
| `"(Poison\|zzzz)"` | the same maps | groups and alternation are parsed |
| `"!(Poison\|zzzz)"` | every map **without** Poison | `!` inside the quotes negates the whole group |
| `!"(Poison\|zzzz)"` | **nothing** | `!` outside the quotes does not work |

→ The output form is `"!(a|b|c)"`: `!` inside, group inside, one term.

That form was first seen on poestash, whose generated patterns are otherwise
unreliable and are not used as a source anywhere in this project. The syntax
stands on Test 6, not on that site.

### Test 7: a term cannot span two lines

**Search:** `Projectiles[\s\S]*Poison`, against Havoc Direction, which carries
`Monsters fire # additional Projectiles` and `Monsters Poison on Hit` on
separate lines.
**Observed:** nothing. Control: `Projectiles` alone matches.

→ No term has been made to span a line break. Combined with Test 1, where two
terms matched on two different lines, the model is per line and satisfied by any
one line, with AND across terms.

**What this probe does not separate.** A failure here is equally explained by
"the scope is one line" and by "`[\s\S]` is not supported syntax". For the
generator the distinction does not matter, because either way no term spanning a
break can be written. Worth separating if anyone ever needs to know.

### Test 8: the property block is searched, and rarity is not a keyword

| Probe | Observed | Conclusion |
| --- | --- | --- |
| `Quantity` | only rolled maps | the `Item Quantity: +71%` block is searchable text |
| `magic` | nothing useful | there is no rarity keyword |

The first is what makes it possible to leave white maps out: they carry no
quantity, so the line is absent and a positive `Quantity` term drops them.

The second closes the other half for good. Magic and rare roll from the same
affix pool, so no text belongs to rare alone, counting modifiers is impossible
by Test 7, and there is no keyword to ask with. **Magic maps cannot be
separated from rare ones.**

---

## Open questions, and the probes that would settle them

Run one at a time in a stash tab holding maps, note everything that lights up.

| Probe | Question | How to read it |
| --- | --- | --- |
| `personal` | Is the "Travel to a Map of this tier or lower by using this in a personal Map Device" description searched? | Every map lighting up means the flavour text is searched, and every word of it ("Map", "tier", "lower", "once", "Device") has to join the ban corpus. The most dangerous open question |
| `Quantity` in a tab holding a chiselled but unrolled map | Does quality alone put an Item Quantity line on a white map? | If it does, the "only rolled maps" term lights chiselled white maps too. Mild: such a map still needs alching, so it is in the right pile for the wrong reason |
| `Havoc` | Is the generated rare map name searched? | If yes, the item name word pool joins the ban corpus, exactly as `Words.dat` did for beasts |
| `Cemetery` | Is the base type searched? | If yes, every map base name joins the ban corpus |
| a 300 character term | Where does the field cut off? | The Bestiary cuts at 249. If the stash has a limit, the generator has to split and name the splits |
| `"^Monsters"` | Do anchors exist, and do they bind to a line or to the item? | Only matters if a fragment ever needs anchoring. The whole-item scope makes anchors far less useful than in the Bestiary |
| `!(Poison)` unquoted | Does an unquoted group work? | If yes, the two quote characters can be dropped from the output. Worth two characters, not worth a wrong guess |
| `poison` against `Poison` | Does the search respect case? | If the lowercase probe finds the same maps, case does not matter, which is what the generator already assumes |

Until those are answered the generator assumes the widest reading. Every string
in `ITEM_CHROME` in `src/lib/map-regex.ts` is treated as searchable and no
fragment may land in it, and collisions are judged without regard to case.
Assuming too much costs a few rejected fragments. Assuming too little would cost
a search that highlights nothing at all, or one that dims maps that were fine.

The case assumption is not idle: the first run of the solver picked `al T` for
the reflect group, which is only safe if case matters, because it sits inside
"addition**al t**imes" on `Monsters' skills Chain # additional times`. The test
caught it.

---

## Data sources

| Source | What it gives | Notes |
| --- | --- | --- |
| poewiki Cargo `mods`, `domain=5` | every area modifier with its full stat text | `domain=5` is the whole area domain and carries Expedition logbook, Eagon mission, Shaper influence and Labyrinth modifiers too. Narrowed by `generation_type` 1 and 2, by `id LIKE "Map%"`, and by excluding `MapCorruptedSideArea%`, which starts with "Map" as well and is what carries the `Vaal Vessel contains …` rewards. That leaves 717 rows and **177 distinct lines**, which is what `pnpm mods:maps` writes |
| poe.re | the tool the author uses in practice, and the reference for output shape | Not scraped. Its behaviour informed the probes above; the model here is this file's own |
| poestash | nothing | Its generated patterns did not hold up in testing. Named only so nobody adds it back as a source |
