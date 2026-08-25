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
regex matched against the **whole item**, not against a single line. A term
wrapped in `"…"` may contain spaces. A term beginning with `!` is negated.

| Property | Status | Evidence |
| --- | --- | --- |
| Whitespace splits the input into terms | ✅ | Test 1 |
| Terms are AND-joined | ✅ | Test 1 |
| A term matches against the whole item, across lines | ✅ | Test 1 |
| `"…"` groups a term containing spaces | ✅ | Test 4 |
| `!` negates, and only its own term | ✅ | Tests 3, 6 |
| `!` belongs **inside** the quotes | ✅ | Test 6, where `!"…"` matched nothing |
| `.` is a wildcard | ✅ | Test 5 |
| Groups `( )` and alternation `\|` | ✅ | Test 6 |
| **Searched:** modifier text | ✅ | Every test |
| **Searched:** item name, base type, rarity, item level | ❓ | Not probed |
| **Searched:** the "Travel to a Map of this tier" description | ❓ | Not probed, and it matters |
| Field length limit | ❓ | Not probed |
| `^` and `$`, and what they anchor to | ❓ | Not probed |

### Why exclusion works here and cannot work in the Bestiary

The Bestiary matches **per line** and shows a row if any single line matches, so
a per-line negation is always satisfied by some other line and the row comes
back regardless. The stash matches a term against the **whole item**, so
`!(A|B)` really does mean "this item contains neither A nor B".

That single difference is why the map tool is exclusion-based while the Bestiary
tool has to enumerate.

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

### Test 1: whitespace splits terms, and a term sees the whole item

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

→ Two conclusions at once. Whitespace splits the input into AND-joined terms,
**and** a term is matched against the whole item rather than line by line. Both
are the opposite of the Bestiary field.

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

---

## Open questions, and the probes that would settle them

Run one at a time in a stash tab holding maps, note everything that lights up.

| Probe | Question | How to read it |
| --- | --- | --- |
| `personal` | Is the "Travel to a Map of this tier or lower by using this in a personal Map Device" description searched? | Every map lighting up means the flavour text is searched, and every word of it ("Map", "tier", "lower", "once", "Device") has to join the ban corpus. The most dangerous open question |
| `Quantity` | Is the quantity / rarity / pack size block searched? | Every rolled map lighting up confirms the boilerplate is readable and must be banned |
| `Havoc` | Is the generated rare map name searched? | If yes, the item name word pool joins the ban corpus, exactly as `Words.dat` did for beasts |
| `Cemetery` | Is the base type searched? | If yes, every map base name joins the ban corpus |
| a 300 character term | Where does the field cut off? | The Bestiary cuts at 249. If the stash has a limit, the generator has to split and name the splits |
| `"^Monsters"` | Do anchors exist, and do they bind to a line or to the item? | Only matters if a fragment ever needs anchoring. The whole-item scope makes anchors far less useful than in the Bestiary |
| `!(Poison)` unquoted | Does an unquoted group work? | If yes, the two quote characters can be dropped from the output. Worth two characters, not worth a wrong guess |

---

## Data sources

| Source | What it gives | Notes |
| --- | --- | --- |
| poewiki Cargo `mods`, `domain=5` | every area modifier with its full stat text, split by `generation_type` into prefixes (1) and suffixes (2) | 173 affix names and 198 distinct stat lines once numbers are normalised. Too broad on its own: `Vaal Vessel contains …`, `Maven releases all Bosses at once` and `Map Boss is accompanied by a Synthesis Boss` are area modifiers of other origins, so the query is narrowed by `id` |
| poe.re | the tool the author uses in practice, and the reference for output shape | Not scraped. Its behaviour informed the probes above; the model here is this file's own |
| poestash | nothing | Its generated patterns did not hold up in testing. Named only so nobody adds it back as a source |
