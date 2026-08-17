import { matchesBestiaryPattern } from "./bestiary-regex.ts";
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
 * could match? A fragment that can land in a generated name is the worst case
 * — the name has nothing to do with the type, so it can turn up on any beast
 * in the league, expensive ones included.
 */
export type FragmentRisk = {
  fragment: string;
  kind: "generated name" | "modifier";
  example: string;
};

let generatedNames: string[] | null = null;

/** 35,237 prefix/suffix pairs, built once and only when something asks. */
function allGeneratedNames() {
  if (generatedNames) return generatedNames;
  const out: string[] = [];
  for (const prefix of MONSTER_NAME_PREFIXES) {
    for (const suffix of MONSTER_NAME_SUFFIXES) out.push(prefix + suffix);
  }
  generatedNames = out;
  return out;
}

const MOD_NAMES = [
  ...BESTIARY_MOD_NAMES,
  ...MONSTER_MOD_NAMES,
  ...OBSERVED_MOD_LINES,
];

function riskOf(fragment: string): FragmentRisk | null {
  const name = allGeneratedNames().find((n) =>
    matchesBestiaryPattern(fragment, n),
  );
  if (name) return { fragment, kind: "generated name", example: name };

  // Titles hang off the end of a name, so a fragment can straddle the seam.
  const titled = MONSTER_NAME_TITLES.find((title) =>
    allGeneratedNames()
      .slice(0, 500)
      .some((n) => matchesBestiaryPattern(fragment, `${n} the ${title}`)),
  );
  if (titled) {
    return { fragment, kind: "generated name", example: `… the ${titled}` };
  }

  const mod = MOD_NAMES.find((m) => matchesBestiaryPattern(fragment, m));
  if (mod) return { fragment, kind: "modifier", example: mod };

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
