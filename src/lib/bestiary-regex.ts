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
 * - Plain case-insensitive **substring** matching (`wldbrstl` finds nothing).
 * - `|` alternation and the `.` wildcard work; `!` negation does not.
 * - `^` anchors to the start of a **line**, not of the whole row
 *   (`^resence` finds nothing while `resence` finds the Presence modifiers).
 * - A literal space is not a plain character, so word breaks travel as `.`.
 * - Each row offers several lines to match against: the beast type name, its
 *   genus and family, and up to three modifier names with their descriptions.
 *
 * Finding the smallest set of fragments covering every wanted beast is set
 * cover, so this uses the usual greedy approximation.
 */

// Explicit extension: Node's test runner resolves this file directly.
import { BESTIARY_MOD_TEXT } from "./bestiary-mods.ts";
import { MONSTER_MOD_TEXT } from "./monster-mods.ts";
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
const MOD_LINES = [...BESTIARY_MOD_TEXT, ...MONSTER_MOD_TEXT].map(normalize);

/** `fragment` may contain ' ' as the `.` wildcard, matching any character. */
function containedIn(fragment: string, line: string) {
  outer: for (let start = 0; start + fragment.length <= line.length; start++) {
    for (let i = 0; i < fragment.length; i++) {
      const f = fragment[i];
      if (f !== " " && f !== line[start + i]) continue outer;
    }
    return true;
  }
  return false;
}

function startsWith(prefix: string, line: string) {
  if (prefix.length > line.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== " " && prefix[i] !== line[i]) return false;
  }
  return true;
}

function endsWith(tail: string, line: string) {
  if (tail.length > line.length) return false;
  const offset = line.length - tail.length;
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] !== " " && tail[i] !== line[offset + i]) return false;
  }
  return true;
}

/**
 * The pool the game builds a captured beast's own name from: a prefix word, a
 * suffix word glued straight onto it, and sometimes a title. "Darkmauler" is
 * "Dark" + "mauler". The Bestiary search reads that name, so a fragment that
 * can occur inside any possible one matches beasts at random.
 */
const NAME_PREFIXES = MONSTER_NAME_PREFIXES.map(normalize);
const NAME_SUFFIXES = MONSTER_NAME_SUFFIXES.map(normalize);
const NAME_TITLES = MONSTER_NAME_TITLES.map((t) => normalize(` ${t}`));

function canOccurInGeneratedName({ body, anchored }: Fragment) {
  if (anchored) {
    // A generated name begins with a prefix word.
    if (NAME_PREFIXES.some((p) => startsWith(body, p))) return true;
    return NAME_PREFIXES.some(
      (p) =>
        p.length < body.length &&
        startsWith(p, body) &&
        NAME_SUFFIXES.some((s) => startsWith(body.slice(p.length), s)),
    );
  }

  if (
    NAME_PREFIXES.some((p) => containedIn(body, p)) ||
    NAME_SUFFIXES.some((s) => containedIn(body, s)) ||
    NAME_TITLES.some((t) => containedIn(body, t))
  ) {
    return true;
  }

  // Or it straddles a seam: prefix|suffix, or suffix|title.
  for (let cut = 1; cut < body.length; cut++) {
    const head = body.slice(0, cut);
    const tail = body.slice(cut);
    if (
      NAME_PREFIXES.some((p) => endsWith(head, p)) &&
      NAME_SUFFIXES.some((s) => startsWith(tail, s))
    ) {
      return true;
    }
    if (
      NAME_SUFFIXES.some((s) => endsWith(head, s)) &&
      NAME_TITLES.some((t) => startsWith(tail, t))
    ) {
      return true;
    }
  }
  return false;
}

/** One alternative of a pattern, kept in solver form (spaces, not dots). */
type Fragment = { body: string; anchored: boolean };

const emit = (f: Fragment) =>
  (f.anchored ? "^" : "") + f.body.split(" ").join(".");

const parse = (alternative: string): Fragment => ({
  anchored: alternative.startsWith("^"),
  body: alternative.replace(/^\^/, "").split(".").join(" "),
});

function fragmentHits(fragment: Fragment, lines: string[]) {
  return lines.some((line) =>
    fragment.anchored
      ? startsWith(fragment.body, line)
      : containedIn(fragment.body, line),
  );
}

/** Does a finished pattern hit this beast? Used by the UI and the tests. */
export function matchesBestiaryPattern(
  pattern: string,
  beast: string | string[],
) {
  const lines = (Array.isArray(beast) ? beast : [beast]).map(normalize);
  return pattern.split("|").some((alt) => fragmentHits(parse(alt), lines));
}

type Candidate = { fragment: Fragment; covers: Set<number>; hits: number };

function candidatesFor(targets: string[][], avoid: string[][]) {
  const out = new Map<string, Candidate>();

  const consider = (fragment: Fragment) => {
    const key = emit(fragment);
    if (out.has(key)) return;

    // Modifier text and generated names ride along on any beast, so either
    // disqualifies a fragment outright.
    if (fragmentHits(fragment, MOD_LINES)) return;
    if (canOccurInGeneratedName(fragment)) return;

    const covers = new Set<number>();
    targets.forEach((lines, i) => {
      if (fragmentHits(fragment, lines)) covers.add(i);
    });
    if (covers.size === 0) return;

    const hits = avoid.reduce(
      (n, lines) => (fragmentHits(fragment, lines) ? n + 1 : n),
      0,
    );
    out.set(key, { fragment, covers, hits });
  };

  for (const lines of targets) {
    const name = lines[0];
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
  /** Fits the search field and matches nothing outside the wanted set. */
  pattern: string;
  /** The beasts this step brings up. */
  covers: string[];
};

export type BestiaryPlan = {
  /** Run in any order — each is exact on its own. */
  steps: BestiaryStep[];
  /**
   * Beasts no fragment can single out, whatever the length budget. "Parasite"
   * is one: its own genus line reads "Parasites", so even `^parasite` catches
   * the cheap variants along with it.
   */
  unreachable: string[];
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
  maxLength = MAX_PATTERN_LENGTH,
): BestiaryPlan {
  const targets = wanted.map(linesOf);
  const avoid = unwanted.map(linesOf);
  if (targets.length === 0) return { steps: [], unreachable: [] };

  // Zero false positives, no exceptions — that is the whole point.
  const usable = [...candidatesFor(targets, avoid).values()].filter(
    (candidate) => candidate.hits === 0,
  );

  const uncovered = new Set(targets.map((_, i) => i));
  const picked: { fragment: string; covers: number[] }[] = [];

  while (uncovered.size > 0) {
    let best: Candidate | null = null;
    let bestGain = 0;

    for (const candidate of usable) {
      let gain = 0;
      for (const i of candidate.covers) if (uncovered.has(i)) gain++;
      if (gain === 0) continue;

      // Most beasts per fragment, shortest fragment on a tie.
      const better =
        best === null ||
        gain > bestGain ||
        (gain === bestGain &&
          emit(candidate.fragment).length < emit(best.fragment).length);
      if (better) {
        best = candidate;
        bestGain = gain;
      }
    }

    if (best === null) break;

    const covers = [...best.covers].filter((i) => uncovered.has(i));
    for (const i of covers) uncovered.delete(i);
    picked.push({ fragment: emit(best.fragment), covers });
  }

  // Pack the fragments into as few searches as the field allows.
  const steps: BestiaryStep[] = [];
  let current: { fragments: string[]; covers: number[] } | null = null;

  for (const { fragment, covers } of picked) {
    const wouldBe = current
      ? current.fragments.join("|").length + 1 + fragment.length
      : fragment.length;

    if (current && wouldBe <= maxLength) {
      current.fragments.push(fragment);
      current.covers.push(...covers);
      continue;
    }
    if (current) {
      steps.push({
        pattern: current.fragments.join("|"),
        covers: current.covers.map((i) => wanted[i].name),
      });
    }
    current = { fragments: [fragment], covers: [...covers] };
  }
  if (current) {
    steps.push({
      pattern: current.fragments.join("|"),
      covers: current.covers.map((i) => wanted[i].name),
    });
  }

  return {
    steps,
    unreachable: [...uncovered].map((i) => wanted[i].name),
  };
}
