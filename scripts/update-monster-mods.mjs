import { writeFileSync } from "node:fs";

/**
 * The modifiers any rare monster — and so any captured beast — can roll, with
 * the text the Bestiary shows for them.
 *
 * The Bestiary-only mods (Farric Presence and friends) live in
 * bestiary-mods.ts; these are the generic monster prefixes and suffixes, which
 * is the far bigger pool: "Soul Eater", "Life Cannot Be Leeched", "Stonemaul".
 * A beast carries several of them and the search reads every one, so any
 * fragment that appears in this text can drag in arbitrary beasts.
 */

const UA = "poe-beast-prices/0.1 (contact: maxikie02@gmail.com)";

const PAGES = ["List of monster prefix mods", "List of monster suffix mods"];

const clean = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const text = new Set();

for (const page of PAGES) {
  const res = await fetch(
    `https://www.poewiki.net/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&formatversion=2&format=json`,
    { headers: { "User-Agent": UA } },
  );
  if (!res.ok) throw new Error(`${page} -> ${res.status}`);
  const data = await res.json();

  const rows = data.parse?.text?.match(/<tr[\s\S]*?<\/tr>/g) ?? [];

  // Column order differs between the tables, and some carry a spawn-weight
  // column full of internal tags that is not text the game ever prints.
  let columns = [];
  let taken = 0;
  for (const row of rows) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/g) ?? []).map(clean);
    if (cells.length === 0) continue;

    if (/^(Prefix|Suffix)$/.test(cells[0])) {
      columns = cells.flatMap((header, i) =>
        /^(Prefix|Suffix|Modifier Name|Effect\(s\))$/.test(header) ? [i] : [],
      );
      continue;
    }
    if (columns.length === 0) continue;

    for (const i of columns) {
      // Spawn-weight tags ("rare 0 default 1000") slip into the effect column
      // of a few tables. They are internal ids, never printed in game.
      if (!cells[i] || (cells[i].includes("_") && !/[A-Z]/.test(cells[i]))) {
        continue;
      }
      text.add(cells[i]);
    }
    taken++;
  }
  console.log(`${page}: ${taken} mods`);
}

const lines = [...text].sort((a, b) => a.localeCompare(b));

const file = `/**
 * Every generic monster modifier a captured beast can carry: the internal
 * name, the name the Bestiary prints, and the effect text.
 *
 * This is the pool behind lines like "Soul Eater" or "Life Cannot Be Leeched"
 * on a beast that has nothing to do with the Bestiary league. The search reads
 * them exactly like the beast's own name, so a fragment found anywhere in here
 * would match beasts at random and is refused.
 *
 * Generated from the PoE Wiki monster prefix and suffix lists. ${lines.length}
 * lines. Regenerate with scripts/update-monster-mods.mjs.
 */
export const MONSTER_MOD_TEXT: string[] = [
${lines.map((l) => `  ${JSON.stringify(l)},`).join("\n")}
];
`;

writeFileSync(new URL("../src/lib/monster-mods.ts", import.meta.url), file);
console.log(`wrote ${lines.length} lines`);
