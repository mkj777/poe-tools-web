/**
 * Plans Bestiary searches that select exactly the beasts asked for.
 *
 * Precision comes first. One search cannot always be both exact and short
 * enough, so this returns as many as it takes — every one of them matching
 * nothing it should not.
 *
 * What the search actually does, established by in-game probing and written up
 * in docs/bestiary-search.md:
 *
 * - A row is matched **line by line** and shown if any single line matches, so
 *   a row offers several targets: the type name, its genus and family, the name
 *   the game generated for that capture, and every modifier name.
 * - It is a real regex engine, not substring matching with three special
 *   characters: `|`, `.`, `^`, `$`, groups, `[^x]` and `(?!…)` all work. `!`
 *   and `"quotes"` do not, and `.` does not cross a line break.
 * - `^` and `$` both bind per line, so `^goatman$` selects "Goatman" without
 *   "Goatman Fire-raiser" — the one form nothing else can match by accident.
 * - A literal space is not a plain character, so word breaks travel as `.`.
 *
 * Only the subset that earns its keep is used. Negation cannot help here: a row
 * is shown when *any* line matches, and a modifier line lacking the term always
 * satisfies a `(?!…)`, so per-line negation cannot exclude a row.
 *
 * Finding the smallest set of fragments covering every wanted beast is set
 * cover, so this uses the usual greedy approximation.
 */

// Explicit extension: Node's test runner resolves this file directly.
import { BESTIARY_MOD_TEXT } from "./bestiary-mods.ts";
import { MONSTER_MOD_TEXT } from "./monster-mods.ts";
import { OBSERVED_MOD_LINES } from "./observed-mods.ts";
import {
  MONSTER_NAME_PREFIXES,
  MONSTER_NAME_SUFFIXES,
  MONSTER_NAME_TITLES,
} from "./monster-words.ts";

/**
 * An anchored fragment only has to clear the handful of strings a line can
 * begin with. A free one can land anywhere in a modifier description, and no
 * list of those is ever complete — "Wild Hellion Alpha" came back for a
 * pattern none of its known text matches — so free fragments have to be long
 * enough that stumbling into English prose is unlikely.
 */
const MIN_ANCHORED_FRAGMENT = 3;
const MIN_FREE_FRAGMENT = 6;
const MAX_FRAGMENT = 14;

/** Letters, and word breaks that leave as a `.` wildcard. */
const SAFE_FRAGMENT = /^[a-z][a-z ]*[a-z]$|^[a-z]+$/;

/** Characters the Bestiary search accepts before it cuts the input off. */
export const MAX_PATTERN_LENGTH = 249;

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

const normalize = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");

export type BeastEntry = {
  name: string;
  /**
   * The separate lines the Bestiary row shows — genus, family, habitat. `^`
   * binds to the start of any one of them, so they cannot be concatenated.
   * Defaults to just the name.
   */
  lines?: string[];
};

const linesOf = (entry: BeastEntry) =>
  [entry.name, ...(entry.lines ?? [])].filter(Boolean).map(normalize);

/**
 * Text every beast can carry regardless of type. A fragment found in here
 * matches beasts at random — `far` catches everything holding "Farric
 * Presence" — so it is never usable.
 */
const MOD_LINES = [
  ...BESTIARY_MOD_TEXT,
  ...MONSTER_MOD_TEXT,
  ...OBSERVED_MOD_LINES,
].map(normalize);

const MOD_BLOB = MOD_LINES.join("\n");

/**
 * The pool the game builds a captured beast's own name from: a prefix word, a
 * suffix word glued straight onto it, and sometimes a title. "Darkmauler" is
 * "Dark" + "mauler". The Bestiary search reads that name, so a fragment that
 * can occur inside any possible one matches beasts at random.
 */
const NAME_PREFIXES = MONSTER_NAME_PREFIXES.map(normalize);
const NAME_SUFFIXES = MONSTER_NAME_SUFFIXES.map(normalize);
const NAME_TITLES = MONSTER_NAME_TITLES.map((t) => normalize(` ${t}`));

/**
 * Asking "could this fragment sit inside any of the 35,237 names?" by walking
 * the three word lists costs about 0.6ms, and the solver asks it nine thousand
 * times — which was 96% of the time a plan took. Every question it needs is a
 * membership test, so the answers are precomputed once instead.
 */
function setOf(words: string[], take: (w: string) => string[]) {
  const out = new Set<string>();
  for (const word of words) for (const part of take(word)) out.add(part);
  return out;
}
const prefixesOf = (w: string) =>
  Array.from({ length: Math.min(w.length, MAX_FRAGMENT) }, (_, i) =>
    w.slice(0, i + 1),
  );
const suffixesOf = (w: string) =>
  Array.from({ length: Math.min(w.length, MAX_FRAGMENT) }, (_, i) =>
    w.slice(w.length - i - 1),
  );
const substringsOf = (w: string) => {
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    for (let len = 1; len <= MAX_FRAGMENT && i + len <= w.length; len++) {
      out.push(w.slice(i, i + len));
    }
  }
  return out;
};

const WORDS_P = new Set(NAME_PREFIXES);
const PRE_P = setOf(NAME_PREFIXES, prefixesOf);
const SUF_P = setOf(NAME_PREFIXES, suffixesOf);
const SUB_P = setOf(NAME_PREFIXES, substringsOf);
const PRE_S = setOf(NAME_SUFFIXES, prefixesOf);
const SUF_S = setOf(NAME_SUFFIXES, suffixesOf);
const SUB_S = setOf(NAME_SUFFIXES, substringsOf);
const PRE_T = setOf(NAME_TITLES, prefixesOf);
const SUB_T = setOf(NAME_TITLES, substringsOf);

/** All 35,237 base names, built on first use — only full-line fragments ask. */
let fullNames: Set<string> | null = null;
function baseNames() {
  if (!fullNames) {
    fullNames = new Set<string>();
    for (const p of NAME_PREFIXES) {
      for (const s of NAME_SUFFIXES) fullNames.add(p + s);
    }
  }
  return fullNames;
}

/**
 * The corpus holds no spaces inside a word, but a fragment's space is a
 * wildcard, so it has to be spelled out before a set can answer for it.
 */
const NAME_ALPHABET = [
  ...new Set(
    [...NAME_PREFIXES, ...NAME_SUFFIXES, ...NAME_TITLES].join("").split(""),
  ),
];
const MAX_VARIANTS = 4000;

function spellOut(body: string) {
  if (!body.includes(" ")) return [body];
  const wildcards = body.split(" ").length - 1;
  if (NAME_ALPHABET.length ** wildcards > MAX_VARIANTS) return null;

  let out = [""];
  for (const ch of body) {
    out =
      ch === " "
        ? out.flatMap((head) => NAME_ALPHABET.map((a) => head + a))
        : out.map((head) => head + ch);
  }
  return out;
}

function occursInName(v: string, anchored: boolean, terminated: boolean) {
  if (anchored && terminated) {
    // The whole line has to equal it: a base name, or one carrying a title.
    if (baseNames().has(v)) return true;
    return NAME_TITLES.some(
      (t) => v.endsWith(t) && baseNames().has(v.slice(0, -t.length)),
    );
  }

  if (anchored) {
    // A generated name begins with a prefix word.
    if (PRE_P.has(v)) return true;
    for (let cut = 1; cut < v.length; cut++) {
      if (WORDS_P.has(v.slice(0, cut)) && PRE_S.has(v.slice(cut))) return true;
    }
    return false;
  }

  if (SUB_P.has(v) || SUB_S.has(v) || SUB_T.has(v)) return true;

  // Or it straddles a seam: prefix|suffix, or suffix|title.
  for (let cut = 1; cut < v.length; cut++) {
    const head = v.slice(0, cut);
    const tail = v.slice(cut);
    if (SUF_P.has(head) && PRE_S.has(tail)) return true;
    if (SUF_S.has(head) && PRE_T.has(tail)) return true;
  }
  return false;
}

function canOccurInGeneratedName({ body, anchored, terminated }: Fragment) {
  const variants = spellOut(body);
  // Too many wildcards to enumerate. Refusing costs a little pattern length;
  // guessing would cost a beast.
  if (!variants) return true;
  return variants.some((v) => occursInName(v, anchored, Boolean(terminated)));
}

/**
 * One alternative of a pattern, kept in solver form (spaces, not dots).
 * `anchored` is a leading `^`, `terminated` a trailing `$`; both together mean
 * the line has to equal the fragment outright.
 */
type Fragment = { body: string; anchored: boolean; terminated?: boolean };

const emit = (f: Fragment) =>
  (f.anchored ? "^" : "") +
  f.body.split(" ").join(".") +
  (f.terminated ? "$" : "");

/**
 * The lines of one row, joined for matching. `.` never matches a newline and
 * `^`/`$` bind per line under `m`, so a blob behaves exactly like the lines it
 * was built from — and hands the work to the regex engine instead of to a
 * character loop, which is the difference between the solver taking seconds and
 * taking milliseconds.
 */
const blobOf = (lines: string[]) => lines.join("\n");

/**
 * A fragment as a regex. Bodies only ever hold `[a-z ]` (see SAFE_FRAGMENT), so
 * the space is the one character that needs translating and nothing needs
 * escaping.
 */
const fragmentRegExp = ({ body, anchored, terminated }: Fragment) =>
  new RegExp(
    `${anchored ? "^" : ""}${body.split(" ").join(".")}${terminated ? "$" : ""}`,
    "m",
  );

/**
 * The game's engine, as far as it has been probed: one regex, tried against
 * each line on its own. Going through `RegExp` rather than the solver's own
 * fragment forms is what lets the simulator answer for a hand-typed `[^x]` or
 * `(?!…)` — the solver never emits those, but a player may well try them.
 *
 * A space is not a plain character in the field, so it travels as a wildcard.
 * An unfinished pattern (`^craicic(`) simply matches nothing.
 */
function compile(pattern: string) {
  try {
    return new RegExp(pattern.split(" ").join("."), "i");
  } catch {
    return null;
  }
}

/** Does a finished pattern hit this beast? Used by the UI and the tests. */
export function matchesBestiaryPattern(
  pattern: string,
  beast: string | string[],
) {
  const lines = (Array.isArray(beast) ? beast : [beast]).map(normalize);
  const re = compile(pattern);
  return re !== null && lines.some((line) => re.test(line));
}

/**
 * Which alternatives of a pattern hit this beast, and on which line. What the
 * simulator shows so a surprise match can be traced to the fragment that
 * caused it rather than guessed at.
 */
export function matchingFragments(pattern: string, beast: string[]) {
  const lines = beast.map(normalize);
  const out: { fragment: string; line: string }[] = [];

  // Splitting on `|` is only for attribution. A hand-typed group leaves halves
  // that do not compile; those are skipped, and the tile still shows as matched.
  for (const alternative of pattern.split("|")) {
    const re = alternative ? compile(alternative) : null;
    if (!re) continue;
    const i = lines.findIndex((line) => re.test(line));
    if (i !== -1) out.push({ fragment: alternative, line: beast[i] });
  }
  return out;
}

type Candidate = {
  fragment: Fragment;
  covers: Set<number>;
  /** Which of the unwanted beasts this fragment also brings up. */
  hits: Set<number>;
};

function candidatesFor(targets: string[][], avoid: string[][]) {
  const out = new Map<string, Candidate>();
  // Every beast whose name contains a fragment offers it again, and "farric"
  // alone sits in some forty names. Without this, each of them pays for the
  // same rejection.
  const rejected = new Set<string>();
  const targetBlobs = targets.map(blobOf);
  const avoidBlobs = avoid.map(blobOf);

  const consider = (fragment: Fragment) => {
    const key = emit(fragment);
    if (out.has(key) || rejected.has(key)) return;

    const re = fragmentRegExp(fragment);

    // Modifier text and generated names ride along on any beast, so either
    // disqualifies a fragment outright.
    if (re.test(MOD_BLOB) || canOccurInGeneratedName(fragment)) {
      rejected.add(key);
      return;
    }

    const covers = new Set<number>();
    targetBlobs.forEach((blob, i) => {
      if (re.test(blob)) covers.add(i);
    });
    if (covers.size === 0) return;

    const hits = new Set<number>();
    avoidBlobs.forEach((blob, i) => {
      if (re.test(blob)) hits.add(i);
    });
    out.set(key, { fragment, covers, hits });
  };

  for (const lines of targets) {
    const name = lines[0];

    // The full name with both anchors. Costs every character of the name plus
    // two, and in exchange nothing but an identical line can match it — which
    // is the only way to single out a name that another beast's name contains
    // ("Goatman" inside "Goatman Fire-raiser"). The solver reaches for it last,
    // since any shorter fragment covering the same beast scores better.
    if (SAFE_FRAGMENT.test(name)) {
      consider({ body: name, anchored: true, terminated: true });
    }

    for (let len = MIN_ANCHORED_FRAGMENT; len <= MAX_FRAGMENT; len++) {
      // Anchored: bound to the start of a line, which rules out mid-word
      // collisions and costs a single character.
      if (len <= name.length) {
        const prefix = name.slice(0, len);
        if (SAFE_FRAGMENT.test(prefix)) consider({ body: prefix, anchored: true });
      }
      if (len < MIN_FREE_FRAGMENT) continue;
      for (let i = 0; i + len <= name.length; i++) {
        const body = name.slice(i, i + len);
        if (SAFE_FRAGMENT.test(body)) consider({ body, anchored: false });
      }
    }
  }
  return out;
}

export type BestiaryStep = {
  /** Fits the search field. */
  pattern: string;
  /** The wanted beasts this step brings up. */
  covers: string[];
  /** Unwanted beasts it brings up too — always empty when exact. */
  extras: string[];
};

export type BestiaryPlan = {
  /** Run in any order. */
  steps: BestiaryStep[];
  /**
   * Beasts no fragment can single out, whatever the length budget. "Goatman"
   * is one: every search that finds it finds "Goatman Fire-raiser" too, so no
   * number of extra steps helps. Only ever filled when exactness is demanded.
   */
  unreachable: string[];
  /** Every unwanted beast the plan brings along, across all steps. */
  falsePositives: string[];
};

export type PlanOptions = {
  maxLength?: number;
  /**
   * What the two modes are actually for.
   *
   * Trashing is destructive: a pattern that shows one expensive beast among
   * the junk gets it thrown away, so nothing outside the selection may match,
   * even at the cost of more searches or of leaving a beast out.
   *
   * Selling is not: the point is to have every valuable beast in front of you,
   * and a cheap one riding along costs nothing. There precision gives way to
   * coverage — every wanted beast is selected, and the extras are named.
   */
  exact?: boolean;
};

/**
 * Plans an exact selection, as however many searches it takes.
 *
 * One pattern for everything means accepting false positives, since the field
 * stops at 249 characters. Several searches do not: only fragments that hit
 * nothing outside the wanted set are used, and when they no longer fit in one
 * pattern they spill into the next. Running every step selects exactly the
 * wanted beasts and nothing else.
 */
export function planBestiaryPatterns(
  wanted: BeastEntry[],
  unwanted: BeastEntry[],
  { maxLength = MAX_PATTERN_LENGTH, exact = true }: PlanOptions = {},
): BestiaryPlan {
  const targets = wanted.map(linesOf);
  const avoid = unwanted.map(linesOf);
  if (targets.length === 0) {
    return { steps: [], unreachable: [], falsePositives: [] };
  }

  const all = [...candidatesFor(targets, avoid).values()];
  // Exact: zero false positives, no exceptions. Otherwise a fragment may drag
  // unwanted beasts along, it just has to earn them.
  const usable = exact ? all.filter((c) => c.hits.size === 0) : all;

  const uncovered = new Set(targets.map((_, i) => i));
  const picked: { fragment: string; covers: number[]; extras: number[] }[] = [];
  const dragged = new Set<number>();

  while (uncovered.size > 0) {
    let best: Candidate | null = null;
    let bestScore = -Infinity;
    let bestGain = 0;

    for (const candidate of usable) {
      let gain = 0;
      for (const i of candidate.covers) if (uncovered.has(i)) gain++;
      if (gain === 0) continue;

      // Beasts already dragged in cost nothing a second time.
      let cost = 0;
      for (const i of candidate.hits) if (!dragged.has(i)) cost++;

      // Most beasts per fragment, fewest newcomers, shortest on a tie.
      const score = gain - cost;
      const better =
        best === null ||
        score > bestScore ||
        (score === bestScore &&
          (gain > bestGain ||
            (gain === bestGain &&
              emit(candidate.fragment).length < emit(best.fragment).length)));
      if (better) {
        best = candidate;
        bestScore = score;
        bestGain = gain;
      }
    }

    if (best === null) break;

    const covers = [...best.covers].filter((i) => uncovered.has(i));
    const extras = [...best.hits].filter((i) => !dragged.has(i));
    for (const i of covers) uncovered.delete(i);
    for (const i of extras) dragged.add(i);
    picked.push({ fragment: emit(best.fragment), covers, extras });
  }

  // Pack the fragments into as few searches as the field allows.
  const steps: BestiaryStep[] = [];
  let current: { fragments: string[]; covers: number[]; extras: number[] } | null =
    null;

  const close = (open: NonNullable<typeof current>) =>
    steps.push({
      pattern: open.fragments.join("|"),
      covers: open.covers.map((i) => wanted[i].name),
      extras: open.extras.map((i) => unwanted[i].name),
    });

  for (const { fragment, covers, extras } of picked) {
    const wouldBe = current
      ? current.fragments.join("|").length + 1 + fragment.length
      : fragment.length;

    if (current && wouldBe <= maxLength) {
      current.fragments.push(fragment);
      current.covers.push(...covers);
      current.extras.push(...extras);
      continue;
    }
    if (current) close(current);
    current = { fragments: [fragment], covers: [...covers], extras: [...extras] };
  }
  if (current) close(current);

  return {
    steps,
    unreachable: [...uncovered].map((i) => wanted[i].name),
    falsePositives: [...dragged].map((i) => unwanted[i].name),
  };
}
