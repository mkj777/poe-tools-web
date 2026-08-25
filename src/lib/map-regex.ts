/**
 * Builds the stash search that highlights the maps still worth running.
 *
 * What the search actually does, established by in-game probing and written up
 * in docs/stash-search.md:
 *
 * - The input is a **list of terms** split on whitespace and joined by AND.
 * - A term is a real regex tried **line by line**, satisfied when any one line
 *   matches. So the AND ranges over the item while a term still ranges over a
 *   line, and nothing a term says may cross a line break.
 * - `"…"` groups a term containing spaces, and a `!` **inside** the quotes
 *   negates that term. `!"…"` does nothing.
 *
 * Negation therefore sits at term level and means "no line of this item
 * matches", which is a statement about the item. That is the whole reason
 * exclusion works here and cannot work in the Bestiary, whose field has no term
 * level to hang it on. `"!(a|b|c)"` reads "this map shows none of a, b, c", and
 * the exclusion is one term however many modifiers were banned.
 *
 * It cannot be split across several searches: a second search replaces the
 * first rather than narrowing it, so what does not fit one field does not work
 * at all.
 *
 * Nothing here is shared with src/lib/bestiary-regex.ts on purpose. Same engine
 * underneath, but that field takes a single unquoted term with no negation, so
 * the two generators have almost nothing to say to each other.
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

/**
 * The three numbers a map is rolled for, as the property block prints them:
 * `Item Quantity: +71%`, `Item Rarity: +41%`, `Monster Pack Size: +27%`.
 *
 * These are worth asking about precisely because the game has already added
 * them up. Every other generator has to reason over the modifier text of each
 * affix and guess at the total; here the total is written on the item, and Test
 * 8 established that the block is searchable.
 *
 * `needle` is the shortest text that reaches one of the three and none of the
 * others. It ends at the colon, so the digits that follow can be asked about.
 */
export type RewardStat = { id: string; label: string; needle: string };

export const REWARD_STATS: readonly RewardStat[] = [
  { id: "quantity", label: "Item Quantity", needle: "Quantity: " },
  { id: "rarity", label: "Item Rarity", needle: "Rarity: " },
  { id: "packSize", label: "Monster Pack Size", needle: "Pack Size: " },
];

/**
 * How many digits a printed value may have. A map's own quantity and rarity
 * come from its affixes and land near a hundred, so three digits is already far
 * past anything the game prints, and every extra one costs characters in a
 * field whose limit is still unknown.
 */
const MAX_DIGITS = 3;

/**
 * A digit position that may be anything. `.` rather than `[0-9]`, which is four
 * characters cheaper each time and cannot go wrong here: the term ends at the
 * `%`, so a wildcard has nowhere to wander. `Quantity: .([6-9].)%` reads 60 to
 * 99 and refuses `+6%`, because there the `%` arrives one character early.
 */
const FREE = ".";

/**
 * A regex body matching every whole number from `min` upwards.
 *
 * Two parts. A number with more digits than `min` is larger by construction,
 * since the game prints no leading zeros. A number with the same count is
 * handled digit by digit: at each position, everything to the left equal,
 * this digit greater, and the rest free. The last position takes "greater or
 * equal" instead, which is what makes `min` itself match.
 *
 * For 30 that reads `[4-9].` (40 to 99) or `3.` (30 to 39), plus `[1-9]..` for
 * everything with a digit more.
 */
export function atLeastPattern(min: number): string {
  const digits = String(Math.max(1, Math.floor(min)));
  const parts: string[] = [];

  for (let i = 0; i < digits.length; i++) {
    const value = Number(digits[i]);
    const low = i === digits.length - 1 ? value : value + 1;
    if (low > 9) continue;
    // A range covering every digit is a wildcard, and one covering a single
    // digit is that digit. Both are shorter than spelling the range out.
    const head = low === 0 ? FREE : low === 9 ? "9" : `[${low}-9]`;
    parts.push(
      digits.slice(0, i) + head + FREE.repeat(digits.length - i - 1),
    );
  }

  for (let len = digits.length + 1; len <= MAX_DIGITS; len++) {
    parts.push("[1-9]" + FREE.repeat(len - 1));
  }

  return parts.join("|");
}

/**
 * The term asking one stat to reach `min`.
 *
 * A minimum of 1 asks only that the line is there at all, which is shorter than
 * spelling out every number from 1 up and means exactly the same thing: the
 * game prints nothing for a stat of zero. That is also what leaves an unrolled
 * white map dark.
 *
 * The `.` stands in for the `+` the block prints before the number. The term is
 * quoted because it carries a space, and an unquoted space would split it into
 * two terms that could then match on two different lines.
 */
export function statTerm(stat: RewardStat, min: number): string | null {
  if (min <= 0) return null;
  if (min === 1) return `"${stat.needle.trim()}"`;
  return `"${stat.needle}.(${atLeastPattern(min)})%"`;
}

export type MapSearch = {
  /** Paste into the stash search. Empty when it would ask for nothing. */
  search: string;
  fragments: Fragment[];
  /**
   * Banned lines no fragment can reach without dimming something allowed.
   * Empty in practice; named rather than silently dropped when it happens.
   */
  unreachable: string[];
};

export type MapSearchOptions = {
  /** Per stat id from `REWARD_STATS`, the smallest value still worth running. */
  minimums?: Readonly<Record<string, number>>;
};

export function planMapSearch(
  bannedLines: readonly string[],
  { minimums = {} }: MapSearchOptions = {},
): MapSearch {
  // Asked for in the order the stats are declared, so the same selection always
  // produces the same string and a copied one stays recognisable.
  const wanted = REWARD_STATS.map((stat) =>
    statTerm(stat, minimums[stat.id] ?? 0),
  ).filter((term): term is string => term !== null);

  const banned = [...new Set(bannedLines)];
  if (banned.length === 0) {
    return { search: wanted.join(" "), fragments: [], unreachable: [] };
  }

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

  // Terms are AND-joined, so the positive ones simply stand beside the negated
  // one: show maps that reach every minimum and carry none of the banned
  // modifiers.
  const terms = [
    ...wanted,
    ...(picked.length ? [`"!(${picked.map((f) => f.text).join("|")})"`] : []),
  ];

  return {
    search: terms.join(" "),
    fragments: picked,
    unreachable: [...uncovered],
  };
}
