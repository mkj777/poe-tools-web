/**
 * Turns a Words.dat export into the word pool the generator checks against.
 *
 *   node scripts/update-monster-words.mjs path/to/words.json
 *
 * Export Words.dat64 from poe-dat-viewer (https://snosme.github.io/poe-dat-viewer/)
 * as JSON. The Wordlist column is the enum index from poe-tool-dev/dat-schema,
 * counting from 1: 3 = MONSTER_PREFIX, 4 = MONSTER_SUFFIX, 5 = MONSTER_TITLE.
 */
import { readFileSync, writeFileSync } from "node:fs";

const WORDLIST = { prefixes: 3, suffixes: 4, titles: 5 };

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/update-monster-words.mjs <words.json>");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(source, "utf8"));
const pick = (list) =>
  [
    ...new Set(
      rows
        .filter((r) => r.Wordlist === list)
        .map((r) => (r.Text ?? "").trim())
        .filter(Boolean),
    ),
  ].sort();

const pools = Object.fromEntries(
  Object.entries(WORDLIST).map(([key, list]) => [key, pick(list)]),
);

const sanity = { prefixes: "Dark", suffixes: "mauler", titles: "the Relentless" };
for (const [key, word] of Object.entries(sanity)) {
  const found = pools[key].some((w) => w.toLowerCase() === word.toLowerCase());
  console.log(`${key.padEnd(9)} ${String(pools[key].length).padStart(4)}  ${word}: ${found ? "found" : "MISSING"}`);
}

const asArray = (name, words) =>
  `export const ${name}: string[] = [\n${words
    .map((w) => `  ${JSON.stringify(w)},`)
    .join("\n")}\n];\n`;

const file = `/**
 * The word pool the game builds rare monster names from — every captured beast
 * shows one, and the Bestiary search reads it. "Darkmauler" is MONSTER_PREFIX
 * "Dark" plus MONSTER_SUFFIX "mauler"; a title like "the Relentless" may follow.
 *
 * A search fragment that can occur inside any of these names would match beasts
 * at random, so the generator refuses it.
 *
 * Extracted from Words.dat via poe-dat-viewer — see
 * scripts/update-monster-words.mjs. ${pools.prefixes.length} prefixes,
 * ${pools.suffixes.length} suffixes, ${pools.titles.length} titles, which
 * together spell ${(pools.prefixes.length * pools.suffixes.length).toLocaleString("en-US")} possible names.
 */
${asArray("MONSTER_NAME_PREFIXES", pools.prefixes)}
${asArray("MONSTER_NAME_SUFFIXES", pools.suffixes)}
${asArray("MONSTER_NAME_TITLES", pools.titles)}`;

writeFileSync(new URL("../src/lib/monster-words.ts", import.meta.url), file);
console.log("wrote src/lib/monster-words.ts");
