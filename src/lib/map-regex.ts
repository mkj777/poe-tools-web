/**
 * Builds the stash search that highlights the maps still worth running.
 *
 * What the search actually does, established by in-game probing and written up
 * in docs/stash-search.md:
 *
 * - The input is a **list of terms** split on whitespace and joined by AND.
 * - A term is a real regex matched against the **whole item**, not line by
 *   line, which is the opposite of the Bestiary search and the reason exclusion
 *   is possible at all.
 * - `"…"` groups a term containing spaces, and a `!` **inside** the quotes
 *   negates that term. `!"…"` does nothing.
 *
 * So `"!(a|b|c)"` reads "this map shows none of a, b, c", and the whole output
 * is one term however many modifiers were banned. It cannot be split across
 * several searches: a second search replaces the first rather than narrowing
 * it, so what does not fit one field does not work at all.
 *
 * Nothing here is shared with src/lib/bestiary-regex.ts on purpose. That engine
 * matches per line, takes a single regex, has no quoting and no negation. The
 * two problems look alike and are not.
 */

// Explicit extension: Node's test runner resolves this file directly.
import { MAP_MOD_LINES } from "./map-mods.ts";
import { REWARD_LINES } from "./map-mod-groups.ts";

/**
 * A fragment shorter than this is a coin flip against the rest of the tooltip.
 * The corpus here is small and known, unlike the Bestiary's open-ended modifier
 * text, so four characters is enough.
 */
const MIN_FRAGMENT = 4;
const MAX_FRAGMENT = 40;

/**
 * Letters and word breaks. No digits, because the number is different on every
 * map tier. No apostrophe either: the game's typography for one is not worth
 * betting a fragment on.
 */
const SAFE_FRAGMENT = /^[a-z][a-z ]*[a-z]$/i;

/**
 * What a map shows besides its modifiers. A term sees the whole item, so a
 * fragment landing in any of this dims every map in the tab.
 *
 * Whether the game really searches all of it is not settled. Assuming it does
 * costs a few rejected fragments; assuming it does not would cost a pattern
 * that highlights nothing. See the open probes in docs/stash-search.md.
 */
export const ITEM_CHROME: readonly string[] = [
  "Map",
  "Tier",
  "Monster Level",
  "Item Quantity",
  "Item Rarity",
  "Monster Pack Size",
  "Quality",
  "Corrupted",
  "Unidentified",
  "Travel to a Map of this tier or lower by using this in a personal Map Device.",
  "Maps can only be used once.",
  "Right click to use.",
  "Shift click to unstack.",
];

/**
 * The literal stretches of a line. A number lands on the item as whatever the
 * tier rolled, so `#` is a wall: a fragment may live inside a stretch and never
 * cross one.
 */
const segmentsOf = (line: string) =>
  line
    .split("#")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Whether the search respects case is not probed yet, so collisions are judged
 * without it. That is the conservative direction: it can only reject fragments
 * a case-sensitive engine would have allowed, and `al T` really does sit inside
 * "addition*al t*imes".
 */
const foldedSegmentsOf = (line: string) =>
  segmentsOf(line).map((s) => s.toLowerCase());

const containedIn = (fragment: string, foldedSegments: string[]) =>
  foldedSegments.some((seg) => seg.includes(fragment.toLowerCase()));

export type Fragment = {
  /**
   * Goes into the term as it stands. Only letters and spaces, so nothing needs
   * escaping.
   */
  text: string;
  /** The banned lines this fragment reaches. */
  covers: string[];
};

export type MapSearch = {
  /** Paste into the stash search. Empty when nothing is banned. */
  search: string;
  fragments: Fragment[];
  /**
   * Banned lines no fragment can reach without dimming something allowed.
   * Empty in practice; named rather than silently dropped when it happens.
   */
  unreachable: string[];
};

export function planMapSearch(bannedLines: readonly string[]): MapSearch {
  const banned = [...new Set(bannedLines)];
  if (banned.length === 0) return { search: "", fragments: [], unreachable: [] };

  const bannedSet = new Set(banned);

  // Everything a map may still show once these are banned. A fragment found
  // here dims a map that was fine to run, which is the expensive mistake: it
  // goes into the reroll pile and gets rolled away.
  const avoid = [
    ...MAP_MOD_LINES.filter((line) => !bannedSet.has(line)),
    ...REWARD_LINES,
    ...ITEM_CHROME,
  ].flatMap(foldedSegmentsOf);

  // The fragment is cut from the segment as written, so the output keeps the
  // game's capitalisation, while every containment test runs on the folded copy.
  const targets = banned.map((line) => ({
    line,
    segments: segmentsOf(line),
    folded: foldedSegmentsOf(line),
  }));

  // Every fragment that reaches at least one banned line and nothing else.
  const candidates = new Map<string, Set<string>>();
  for (const target of targets) {
    for (const segment of target.segments) {
      for (let len = MIN_FRAGMENT; len <= MAX_FRAGMENT; len++) {
        for (let i = 0; i + len <= segment.length; i++) {
          const text = segment.slice(i, i + len);
          if (!SAFE_FRAGMENT.test(text)) continue;
          if (candidates.has(text)) continue;
          if (containedIn(text, avoid)) continue;

          const covers = new Set<string>();
          for (const other of targets) {
            if (containedIn(text, other.folded)) covers.add(other.line);
          }
          candidates.set(text, covers);
        }
      }
    }
  }

  // Fewest fragments covering every banned line is set cover, so this is the
  // usual greedy approximation: most new lines first, shortest on a tie.
  const uncovered = new Set(banned);
  const picked: Fragment[] = [];

  while (uncovered.size > 0) {
    let best: Fragment | null = null;
    let bestGain = 0;

    for (const [text, covers] of candidates) {
      let gain = 0;
      for (const line of covers) if (uncovered.has(line)) gain++;
      if (gain === 0) continue;
      if (
        best === null ||
        gain > bestGain ||
        (gain === bestGain && text.length < best.text.length)
      ) {
        best = { text, covers: [...covers].filter((l) => uncovered.has(l)) };
        bestGain = gain;
      }
    }

    if (best === null) break;
    for (const line of best.covers) uncovered.delete(line);
    picked.push(best);
  }

  return {
    search: picked.length ? `"!(${picked.map((f) => f.text).join("|")})"` : "",
    fragments: picked,
    unreachable: [...uncovered],
  };
}
