/**
 * Builds a search string for the in-game Bestiary window that matches every
 * wanted beast and as few unwanted ones as possible.
 *
 * The game's search is a case-insensitive regex over the beast name, so the
 * output is a `a|b|c` alternation of short name fragments. Finding the smallest
 * such set is set cover, so this uses the usual greedy approximation:
 * repeatedly take the fragment that covers the most still uncovered beasts.
 */

const MIN_FRAGMENT = 3;
const MAX_FRAGMENT = 14;

/**
 * Letters, and word breaks that leave as a `.` wildcard. A literal space is
 * never emitted: the search field does not treat it as a plain character.
 */
const SAFE_FRAGMENT = /^[a-z][a-z ]*$|^ [a-z ]*[a-z]$/;

/** Stand-in for the word break inside the solver, swapped for `.` on the way out. */
const SPACE = " ";

/** Characters the Bestiary search accepts before it cuts the input off. */
export const MAX_PATTERN_LENGTH = 249;

/**
 * How many unwanted beasts a single fragment may match. Every tolerance gets
 * solved and the most precise pattern that fits the length budget wins — a
 * looser fragment sometimes beats a strict one outright, because it can cover a
 * beast that would otherwise fall back to a very broad word.
 */
const TOLERANCES = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

const normalize = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");

function fragmentsOf(name: string) {
  const out = new Set<string>();
  for (let len = MIN_FRAGMENT; len <= MAX_FRAGMENT; len++) {
    for (let i = 0; i + len <= name.length; i++) {
      const fragment = name.slice(i, i + len);
      if (SAFE_FRAGMENT.test(fragment)) out.add(fragment);
    }
  }
  return out;
}

/**
 * Does `fragment` hit `name` under the loosest reading of the search field?
 *
 * The field is not a plain substring search: patterns matched beasts that share
 * no substring with the target at all ("Farric Ursa" came back for a pattern
 * containing `fir` and `ris`). The only reading that explains every observed
 * hit is subsequence matching — the characters have to appear in order, but not
 * next to each other. A fragment counts as unsafe if it hits either way, so the
 * result holds whichever the game actually does.
 *
 * A ` ` inside the fragment is the `.` wildcard, and matches any character.
 */
function hits(fragment: string, name: string) {
  if (substringHit(fragment, name)) return true;

  let i = 0;
  for (const ch of name) {
    if (fragment[i] === " " || fragment[i] === ch) i++;
    if (i === fragment.length) return true;
  }
  return false;
}

function substringHit(fragment: string, name: string) {
  outer: for (let start = 0; start + fragment.length <= name.length; start++) {
    for (let i = 0; i < fragment.length; i++) {
      const f = fragment[i];
      if (f !== " " && f !== name[start + i]) continue outer;
    }
    return true;
  }
  return false;
}

/** Does a finished pattern hit this beast name? Used by the UI and the tests. */
export function matchesBestiaryPattern(pattern: string, name: string) {
  const target = normalize(name);
  return pattern
    .split("|")
    .some((alternative) => hits(alternative.split(".").join(" "), target));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest space-free chunk of a name, used when nothing can isolate it. */
function longestWord(name: string) {
  const words = name.split(/[^a-z]+/).filter(Boolean);
  const longest = words.reduce((a, b) => (b.length >= a.length ? b : a), "");
  return longest || escapeRegex(name);
}

type Candidate = { covers: Set<number>; hits: number };

function candidatesFor(targets: string[], avoid: string[]) {
  const out = new Map<string, Candidate>();
  for (const target of targets) {
    for (const fragment of fragmentsOf(target)) {
      if (out.has(fragment)) continue;

      const covers = new Set<number>();
      targets.forEach((name, i) => {
        if (name.includes(fragment)) covers.add(i);
      });
      const falsePositives = avoid.reduce(
        (n, name) => (hits(fragment, name) ? n + 1 : n),
        0,
      );
      out.set(fragment, { covers, hits: falsePositives });
    }
  }
  return out;
}

/** One greedy pass, allowing fragments that match up to `tolerance` unwanted beasts. */
function solve(
  targets: string[],
  candidates: Map<string, Candidate>,
  tolerance: number,
) {
  const usable = [...candidates].filter(([, c]) => c.hits <= tolerance);
  const uncovered = new Set(targets.map((_, i) => i));
  const picked: string[] = [];

  while (uncovered.size > 0) {
    let best: string | null = null;
    let bestGain = 0;
    let bestHits = Infinity;

    for (const [fragment, candidate] of usable) {
      let gain = 0;
      for (const i of candidate.covers) if (uncovered.has(i)) gain++;
      if (gain === 0) continue;

      // Most beasts per fragment, then fewest false positives, then shortest.
      const better =
        gain > bestGain ||
        (gain === bestGain &&
          (candidate.hits < bestHits ||
            (candidate.hits === bestHits &&
              best !== null &&
              fragment.length < best.length)));
      if (better) {
        best = fragment;
        bestGain = gain;
        bestHits = candidate.hits;
      }
    }

    if (best === null) {
      // Nothing left can isolate these ("Parasite" lives inside "Plated
      // Parasite"), so take the longest word and accept the extras.
      for (const i of uncovered) picked.push(longestWord(targets[i]));
      break;
    }

    for (const i of candidates.get(best)!.covers) uncovered.delete(i);
    picked.push(best);
  }

  return picked.join("|").split(SPACE).join(".");
}

export type BestiaryRegexResult = {
  /** The search string, or null when nothing fits the length budget. */
  pattern: string | null;
  /**
   * Beasts below the threshold that the pattern still matches — either because
   * a wanted name is fully contained in a cheaper one ("Parasite" inside
   * "Plated Parasite"), or because a shorter pattern was needed to fit.
   */
  overmatched: string[];
};

export function buildBestiaryRegex(
  wanted: string[],
  unwanted: string[],
  maxLength = MAX_PATTERN_LENGTH,
): BestiaryRegexResult {
  const targets = wanted.map(normalize);
  const avoid = unwanted.map(normalize);
  if (targets.length === 0) return { pattern: null, overmatched: [] };

  const candidates = candidatesFor(targets, avoid);
  let best: BestiaryRegexResult = { pattern: null, overmatched: [] };

  for (const tolerance of TOLERANCES) {
    const pattern = solve(targets, candidates, tolerance);
    if (pattern.length > maxLength) continue;

    const overmatched = unwanted.filter((name) =>
      matchesBestiaryPattern(pattern, name),
    );

    // Fewest false positives wins, shortest pattern breaks the tie.
    const better =
      best.pattern === null ||
      overmatched.length < best.overmatched.length ||
      (overmatched.length === best.overmatched.length &&
        pattern.length < best.pattern.length);
    if (better) best = { pattern, overmatched };
    if (overmatched.length === 0) break;
  }

  return best;
}
