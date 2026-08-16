/**
 * Works out which beasts show up red on the minimap, and writes the list to
 * src/lib/beast-rarity.ts.
 *
 *   node scripts/update-beast-rarity.mjs
 *
 * Per the PoE Wiki's Beast article: yellow beasts are any normally spawnable
 * monster of the Beast category and carry one Bestiary mod; red beasts cannot
 * be encountered normally, carry two mods, and have far more life. So red is
 * the closed list — everything else is yellow by definition.
 *
 * Two sources, because neither is complete on its own: each beast's own wiki
 * page usually says "capturable red beast" outright, and the families that
 * cannot spawn normally are recognisable by name.
 */
import { writeFileSync } from "node:fs";

const UA = "poe-beast-prices/0.1 (contact: maxikie02@gmail.com)";

/** Spirit beasts, their First Ones, the Harvest beasts, and the Mórrigan. */
const RED_FAMILIES = [
  /^(farric|craicic|fenumal|saqawine) /i,
  /^(wild|vivid|primal) /i,
  /^(farrul|fenumus|craiceann|saqawal),/i,
  /^(the )?black mórrigan$/i,
];

const trade = await (
  await fetch("https://www.pathofexile.com/api/trade/data/items", {
    headers: { "User-Agent": UA },
  })
).json();
const names = trade.result
  .find((g) => g.label === "Itemised Monsters")
  .entries.map((e) => e.name ?? e.type)
  .filter(Boolean);

console.log(`checking ${names.length} beasts against the wiki`);

const pages = new Map();
for (let i = 0; i < names.length; i += 40) {
  const url =
    "https://www.poewiki.net/api.php?format=json&action=query&prop=revisions" +
    "&rvprop=content&rvslots=main&redirects=1&titles=" +
    encodeURIComponent(names.slice(i, i + 40).join("|"));
  const data = await (await fetch(url, { headers: { "User-Agent": UA } })).json();

  const alias = new Map();
  for (const r of data.query?.redirects ?? []) alias.set(r.to, r.from);
  for (const n of data.query?.normalized ?? []) alias.set(n.to, n.from);
  for (const page of Object.values(data.query?.pages ?? {})) {
    const text = page.revisions?.[0]?.slots?.main?.["*"] ?? "";
    pages.set((alias.get(page.title) ?? page.title).toLowerCase(), text);
  }
}

const fromWiki = names.filter((n) => /red beast/i.test(pages.get(n.toLowerCase()) ?? ""));
const fromName = names.filter((n) => RED_FAMILIES.some((re) => re.test(n)));
const red = [...new Set([...fromWiki, ...fromName])].sort();

console.log(`wiki states red for ${fromWiki.length}, names imply ${fromName.length}`);
console.log(`union: ${red.length} red, ${names.length - red.length} yellow`);
const onlyName = fromName.filter((n) => !fromWiki.includes(n));
if (onlyName.length) console.log(`by name only: ${onlyName.join(", ")}`);

const file = `/**
 * Beasts that appear as a red beast on the minimap: two Bestiary modifiers,
 * much more life, and impossible to run into outside a Bestiary spawn. Every
 * other capturable beast is a yellow one, so only this list needs storing.
 *
 * ${red.length} entries, from each beast's PoE Wiki page plus the families that
 * cannot spawn normally. Regenerate with scripts/update-beast-rarity.mjs.
 */
export const RED_BEASTS: string[] = [
${red.map((n) => `  ${JSON.stringify(n)},`).join("\n")}
];

const RED = new Set(RED_BEASTS.map((n) => n.toLowerCase()));

export type BeastRarity = "red" | "yellow";

export const rarityOf = (name: string): BeastRarity =>
  RED.has(name.toLowerCase()) ? "red" : "yellow";
`;

writeFileSync(new URL("../src/lib/beast-rarity.ts", import.meta.url), file);
console.log("wrote src/lib/beast-rarity.ts");
