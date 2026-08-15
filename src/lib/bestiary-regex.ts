/**
 * Builds a search string for the in-game Bestiary window that matches every
 * wanted beast and none of the unwanted ones.
 *
 * The game's search is a case-insensitive regex over the beast name, so the
 * output is a `a|b|c` alternation of the shortest safe name fragments. Finding
 * the smallest such set is set cover, so this uses the usual greedy
 * approximation: repeatedly take the fragment that covers the most still
 * uncovered beasts.
 */

const MIN_FRAGMENT = 3;
const MAX_FRAGMENT = 9;

/**
 * Letters only, never spanning a space. A fragment like "l p" looks harmless
 * but the in-game search does not treat the space as a literal: patterns with
 * spaces pulled in beasts that share no substring at all (a "l p" fragment
 * matched "Sulphuric Scorpion"). Single words are unambiguous.
 */
const WORD_FRAGMENT = /^[a-z]+$/;

/** Same, but may span one space, which is emitted as a `.` wildcard. */
const PHRASE_FRAGMENT = /^[a-z]+ [a-z]+$/;

/** Placeholder for the space, swapped for `.` on the way out. */
const SPACE = " ";

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

const normalize = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");

function fragmentsOf(name: string, wildcard: boolean) {
  const out = new Set<string>();
  for (let len = MIN_FRAGMENT; len <= MAX_FRAGMENT; len++) {
    for (let i = 0; i + len <= name.length; i++) {
      const fragment = name.slice(i, i + len);
      if (WORD_FRAGMENT.test(fragment)) out.add(fragment);
      else if (wildcard && PHRASE_FRAGMENT.test(fragment)) out.add(fragment);
    }
  }
  return out;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest space-free chunk of a name, so the pattern never needs a space. */
function longestWord(name: string) {
  const words = name.split(/[^a-z]+/).filter(Boolean);
  const longest = words.reduce((a, b) => (b.length >= a.length ? b : a), "");
  return longest || escapeRegex(name);
}

export type BestiaryRegexResult = {
  pattern: string;
  /**
   * Beasts below the threshold that the pattern still matches. Only happens
   * when a wanted name is fully contained in an unwanted one (for example
   * "Parasite" inside "Plated Parasite"), where no substring can separate them.
   */
  overmatched: string[];
};

export type BestiaryRegexOptions = {
  /**
   * Allow fragments that span a word break, written as a `.` wildcard. Shorter
   * and far more selective patterns, but it relies on the search supporting
   * `.`; leave it off for plain-substring-only matching.
   */
  wildcard?: boolean;
};

export function buildBestiaryRegex(
  wanted: string[],
  unwanted: string[],
  { wildcard = false }: BestiaryRegexOptions = {},
): BestiaryRegexResult {
  const targets = wanted.map(normalize);
  const avoid = unwanted.map(normalize);
  if (targets.length === 0) return { pattern: "", overmatched: [] };

  // Fragments that appear in no unwanted beast, mapped to what they cover.
  const coverage = new Map<string, Set<number>>();
  const seen = new Set<string>();
  for (const target of targets) {
    for (const fragment of fragmentsOf(target, wildcard)) {
      if (seen.has(fragment)) continue;
      seen.add(fragment);
      if (avoid.some((name) => name.includes(fragment))) continue;

      const covers = new Set<number>();
      targets.forEach((name, i) => {
        if (name.includes(fragment)) covers.add(i);
      });
      coverage.set(fragment, covers);
    }
  }

  const uncovered = new Set(targets.map((_, i) => i));
  const picked: string[] = [];

  while (uncovered.size > 0) {
    let best: string | null = null;
    let bestGain = 0;

    for (const [fragment, covers] of coverage) {
      let gain = 0;
      for (const i of covers) if (uncovered.has(i)) gain++;
      if (gain === 0) continue;
      // More beasts per fragment first, shorter fragment on a tie.
      if (
        gain > bestGain ||
        (gain === bestGain && best !== null && fragment.length < best.length)
      ) {
        best = fragment;
        bestGain = gain;
      }
    }

    if (best === null) {
      // No fragment can isolate what is left ("Parasite" lives inside "Plated
      // Parasite"). Fall back to the longest single word and accept the extras,
      // which get reported below.
      for (const i of uncovered) picked.push(longestWord(targets[i]));
      break;
    }

    for (const i of coverage.get(best)!) uncovered.delete(i);
    picked.push(best);
    coverage.delete(best);
  }

  // A literal space is not safe in the search field, so it leaves as `.`.
  const pattern = picked.join("|").split(SPACE).join(".");
  const matcher = new RegExp(pattern, "i");

  return {
    pattern,
    overmatched: unwanted.filter((name) => matcher.test(normalize(name))),
  };
}
