import { mkdir, writeFile } from "node:fs/promises";
import { EXCLUSIONS, BOOSTS } from "../src/lib/scarab-nodes.ts";

/**
 * Downloads the icon the Atlas tree draws for each of the passives in
 * `src/lib/scarab-nodes.ts`, into `public/atlas/<id>.png`.
 *
 * Two sources, and both are needed. GGG publishes the tree itself, which is
 * what says which art file a node wears; the icons in it are only ever served
 * as sprite sheets, in JPEG, at 49 pixels. The wiki has the same art as
 * individual PNGs with their transparency intact, under a name built from the
 * art file GGG named. So the mapping comes from GGG and the pixels from the
 * wiki, and neither is guessed at.
 *
 * The node icons have nothing to do with the scarabs they concern: Crystalline
 * Carapaces finds Essence scarabs and wears the Harvest art. Nothing here reads
 * a family out of a filename, and nothing should.
 *
 *   node scripts/fetch-atlas-icons.mjs
 */

const TREE =
  "https://raw.githubusercontent.com/grindinggear/atlastree-export/master/data.json";
const WIKI = "https://www.poewiki.net/w/api.php";
const UA = "poe-tools-web/0.1 (personal tool; maxikie02@gmail.com)";

/** The wiki names an atlas passive icon after the art file it came from. */
const wikiTitle = (iconPath) => {
  const stem = iconPath.split("/").pop().replace(/\.png$/i, "");
  return `File:${stem}_(AtlasTrees)_passive_skill_icon.png`;
};

async function json(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

const nodes = [...EXCLUSIONS, ...BOOSTS];

console.log(`Reading the tree for ${nodes.length} passives...`);
const tree = await json(TREE);

// The tree is keyed by node id, so it is searched by the name we hold.
const byName = new Map();
for (const node of Object.values(tree.nodes ?? {})) {
  if (node.name) byName.set(node.name, node);
}

const wanted = nodes.map((node) => {
  const found = byName.get(node.notable);
  if (!found) throw new Error(`${node.notable} is in no Atlas tree node`);
  if (!found.isNotable) throw new Error(`${node.notable} is not a notable`);
  return { id: node.id, name: node.notable, title: wikiTitle(found.icon) };
});

// One request for all of them: the API takes up to fifty titles at a time.
const titles = [...new Set(wanted.map((w) => w.title))];
const query = await json(
  `${WIKI}?action=query&format=json&prop=imageinfo&iiprop=url&titles=${titles
    .map(encodeURIComponent)
    .join("|")}`,
);

// The API answers under the title it normalised ours to, which is the same
// name with the underscores turned back into spaces. Both sides are spelled
// the same way here so the lookup cannot miss.
const spaced = (title) => title.replace(/_/g, " ");

const urls = new Map();
for (const page of Object.values(query.query?.pages ?? {})) {
  const url = page.imageinfo?.[0]?.url;
  if (url) urls.set(spaced(page.title), url);
}

await mkdir(new URL("../public/atlas/", import.meta.url), { recursive: true });

let written = 0;
const missing = [];
for (const { id, name, title } of wanted) {
  const url = urls.get(spaced(title));
  if (!url) {
    missing.push(`${name} (${title})`);
    continue;
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    missing.push(`${name} -> ${res.status}`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  // A PNG and nothing else: an error page saved as .png is a broken image
  // that no build would notice.
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    missing.push(`${name} is not a PNG`);
    continue;
  }
  await writeFile(new URL(`../public/atlas/${id}.png`, import.meta.url), bytes);
  written++;
  console.log(`  ${id}.png  ${bytes.length} bytes  ${name}`);
}

console.log(`\nWrote ${written} of ${wanted.length}.`);
if (missing.length) {
  console.error("Missing:\n  " + missing.join("\n  "));
  process.exitCode = 1;
}
