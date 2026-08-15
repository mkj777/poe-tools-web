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
const MAX_FRAGMENT = 7;

/** Only plain letters/spaces — keeps the result typeable and regex-safe. */
const SAFE_FRAGMENT = /^[a-z][a-z ]*[a-z]$/;

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

export function buildBestiaryRegex(
  wanted: string[],
  unwanted: string[],
): BestiaryRegexResult {
  const targets = wanted.map(normalize);
  const avoid = unwanted.map(normalize);
  if (targets.length === 0) return { pattern: "", overmatched: [] };

  // Fragments that appear in no unwanted beast, mapped to what they cover.
  const coverage = new Map<string, Set<number>>();
  const seen = new Set<string>();
  for (const target of targets) {
    for (const fragment of fragmentsOf(target)) {
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
      // Every remaining name is a substring of an unwanted one — no fragment
      // can isolate it, so fall back to the full names and accept the extras.
      for (const i of uncovered) picked.push(escapeRegex(targets[i]));
      break;
    }

    for (const i of coverage.get(best)!) uncovered.delete(i);
    picked.push(best);
    coverage.delete(best);
  }

  const pattern = picked.join("|");
  const matcher = new RegExp(pattern, "i");

  return {
    pattern,
    overmatched: unwanted.filter((name) => matcher.test(normalize(name))),
  };
}
