import { writeFileSync } from "node:fs";

const UA = "poe-beast-prices/0.1 (contact: maxikie02@gmail.com)";

const raw = await (
  await fetch(
    "https://www.poewiki.net/index.php?title=List_of_bestiary_modifiers&action=raw",
    { headers: { "User-Agent": UA } },
  )
).text();

const clean = (s) =>
  s
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const mods = [];
for (const line of raw.split("\n")) {
  if (!line.startsWith("| ")) continue;
  const cells = line.slice(2).split("||").map(clean);
  if (cells.length < 4) continue;
  const [name, , , effect] = cells;
  if (!name || name === "Name") continue;
  mods.push({ name, effect });
}

// Cargo has a few names the list page omits (and vice versa).
const cargo = await (
  await fetch(
    "https://www.poewiki.net/index.php?title=Special:CargoExport&format=json&limit=2000" +
      "&tables=mods&fields=name&where=" +
      encodeURIComponent('id LIKE "%Bestiary%"'),
    { headers: { "User-Agent": UA } },
  )
).json();
for (const row of cargo) {
  const name = clean(row.name ?? "");
  if (name && !mods.some((m) => m.name === name)) mods.push({ name, effect: "" });
}

mods.sort((a, b) => a.name.localeCompare(b.name));

const body = mods
  .map(
    (m) =>
      `  ${JSON.stringify(m.name)}${m.effect ? `,\n  ${JSON.stringify(m.effect)}` : ""},`,
  )
  .join("\n");

const file = `/**
 * Every Bestiary modifier name and its visible description.
 *
 * A captured beast carries up to three of these, and the Bestiary search reads
 * them: searching "far" returns beasts with "Farric Presence" as surely as
 * beasts named "Farric ...". Any fragment appearing in this text would drag in
 * arbitrary beasts, so the generator refuses to use one.
 *
 * Generated from the PoE Wiki (List_of_bestiary_modifiers + the mods table).
 * ${mods.length} entries. Regenerate with scripts/update-bestiary-mods.mjs.
 */
export const BESTIARY_MOD_TEXT: string[] = [
${body}
];

/**
 * Just the names — what a captured beast's tooltip prints in red above the
 * ordinary monster modifiers. The simulation rolls from these.
 */
export const BESTIARY_MOD_NAMES: string[] = [
${mods
  // Only the ones the list page describes. The rest come from Cargo by id and
  // are internal affix names ("of Beasts") the Bestiary never prints.
  .filter((m) => m.effect)
  .map((m) => `  ${JSON.stringify(m.name)},`)
  .join("\n")}
];
`;

writeFileSync(new URL("../src/lib/bestiary-mods.ts", import.meta.url), file);
console.log(`wrote ${mods.length} mods`);
console.log(mods.slice(0, 5).map((m) => `${m.name} :: ${m.effect.slice(0, 60)}`).join("\n"));
