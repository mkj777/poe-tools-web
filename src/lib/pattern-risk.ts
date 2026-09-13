import {
  compileBestiaryPattern,
  normalizeBestiaryLine,
} from "./bestiary-regex.ts";
import { BESTIARY_MOD_NAMES } from "./bestiary-mods.ts";
import { MONSTER_MOD_NAMES } from "./monster-mods.ts";
import { OBSERVED_MOD_LINES } from "./observed-mods.ts";
import {
  MONSTER_NAME_PREFIXES,
  MONSTER_NAME_SUFFIXES,
  MONSTER_NAME_TITLES,
} from "./monster-words.ts";

/**
 * What a fragment can hit besides the beast it was built for.
 *
 * One roll of the simulation only shows one set of names and modifiers. This
 * asks the question that matters instead: is there *any* capture this fragment
 * could match? A fragment that can land in a generated name is the worst case:
 * the name has nothing to do with the type, so it can turn up on any beast in
 * the league, expensive ones included.
 *
 * The fragment is compiled once and tested against every line. It used to be
 * compiled once per line, which for one typed fragment was up to 35,237
 * regexes for the names and another 108,500 for the titles, on the main
 * thread, per keystroke. The lines are prepared once, the way the search
 * engine would see them, and kept; the regex is the only thing built per call.
 */
export type FragmentRisk = {
  fragment: string;
  kind: "generated name" | "modifier";
  example: string;
};

/** A line as the game prints it, beside the same line as the search reads it. */
type Line = { shown: string; read: string };

const line = (shown: string): Line => ({
  shown,
  read: normalizeBestiaryLine(shown),
});

let generatedNames: Line[] | null = null;

/** 35,237 prefix/suffix pairs, built once and only when something asks. */
function allGeneratedNames() {
  if (generatedNames) return generatedNames;
  const out: Line[] = [];
  for (const prefix of MONSTER_NAME_PREFIXES) {
    for (const suffix of MONSTER_NAME_SUFFIXES) out.push(line(prefix + suffix));
  }
  generatedNames = out;
  return out;
}

/**
 * How many names a title is tried against. Titles hang off the end of a name,
 * so a fragment can straddle the seam, and a sample of names is enough to
 * find one that does.
 */
const TITLE_SAMPLE = 500;

/** Every title, prepared once. Normalizing is per character, so a name and a
    title prepared apart read the same joined as they would joined first. */
const TITLES = MONSTER_NAME_TITLES.map((title) => ({
  shown: title,
  read: normalizeBestiaryLine(` the ${title}`),
}));

const MOD_NAMES = [
  ...BESTIARY_MOD_NAMES,
  ...MONSTER_MOD_NAMES,
  ...OBSERVED_MOD_LINES,
].map(line);

function riskOf(fragment: string): FragmentRisk | null {
  const re = compileBestiaryPattern(fragment);
  if (!re) return null;

  const name = allGeneratedNames().find((n) => re.test(n.read));
  if (name) return { fragment, kind: "generated name", example: name.shown };

  const sample = allGeneratedNames().slice(0, TITLE_SAMPLE);
  const titled = TITLES.find((title) =>
    sample.some((n) => re.test(n.read + title.read)),
  );
  if (titled) {
    return { fragment, kind: "generated name", example: `… the ${titled.shown}` };
  }

  const mod = MOD_NAMES.find((m) => re.test(m.read));
  if (mod) return { fragment, kind: "modifier", example: mod.shown };

  return null;
}

export function patternRisks(pattern: string): FragmentRisk[] {
  const seen = new Set<string>();
  const risks: FragmentRisk[] = [];

  for (const fragment of pattern.split("|")) {
    if (!fragment || seen.has(fragment)) continue;
    seen.add(fragment);
    const risk = riskOf(fragment);
    if (risk) risks.push(risk);
  }
  return risks;
}
