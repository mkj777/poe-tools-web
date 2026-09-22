import {
  BEASTS_FAQ,
  HOME_FAQ,
  LEVELING_FAQ,
  MAPS_FAQ,
  SCARABS_FAQ,
} from "./faq.ts";
import {
  SIDEBAR_ENTRIES,
  SITE_TOOLS,
  toolBySlug,
  toolHref,
  type SiteTool,
} from "./nav.ts";
import { BOOSTS, EXCLUSIONS, type ScarabNode } from "./scarab-nodes.ts";
import type { Faq } from "./seo.ts";
import { toolByName, type ExternalTool, type ToolIcon } from "./tools.ts";
import { topicById, type TopicId } from "./topics.ts";

/**
 * The search behind the palette: what it reads, how it ranks, and where a hit
 * goes.
 *
 * Everything searchable on this site is a few dozen records already declared
 * in `src/lib`: the sixteen tools, the questions under each page and the
 * twenty one Atlas passives. That is small enough that no index structure is
 * needed, only the text normalised once so a keystroke costs a handful of
 * string comparisons per record. What needs care is not speed but the ranking,
 * because a name, an abbreviation, a subject and a sentence of description are
 * not the same kind of evidence, and the palette has to say why a tool came up
 * when the query is nowhere in its name.
 */

/** Where a hit takes you. Resolved into a URL only once the league is known. */
export type SearchTarget =
  | { kind: "page"; slug: string }
  | { kind: "link"; name: string }
  | { kind: "faq"; page: "home" | string; index: number }
  | { kind: "node"; id: string };

export type SearchEntry = {
  id: string;
  kind: SearchTarget["kind"];
  target: SearchTarget;
  title: string;
  /** The line under the title: the blurb, the page a question is on, the effect. */
  subtitle: string;
  /** None for a question, which wears a glyph instead. */
  icon: ToolIcon | null;
  external: boolean;
  topics: readonly TopicId[];
  /** As written in the registry, for the badge that names the match. */
  aliases: readonly string[];
  /** Ties in a group break on this: the sidebar's order, or declaration order. */
  order: number;
  text: {
    title: string;
    titleWords: string[];
    aliases: string[][];
    topicTerms: { topic: TopicId; term: string; words: string[] }[];
    blurbWords: string[];
    body: string;
    bodyWords: string[];
  };
};

export type SearchIndex = {
  entries: readonly SearchEntry[];
  byId: ReadonlyMap<string, SearchEntry>;
};

export type Hit = {
  entry: SearchEntry;
  score: number;
  /** The subject or alias that matched, when the title itself did not. */
  reason?: string;
};

export type SearchGroupId = "tools" | "questions" | "nodes";
export type SearchGroup = { id: SearchGroupId; label: string; hits: Hit[] };

/**
 * How many of each a query shows. Enough to scan, too few to scroll.
 *
 * The tools are capped at the largest subject rather than at a round number:
 * asking for "price" has to answer with every tool that reads one, or the
 * subject a record matched on is a promise the list breaks. A test holds the
 * two together.
 */
export const GROUP_CAPS = { tools: 9, questions: 5, nodes: 6 } as const;

/** How many entries the palette remembers having opened. */
export const RECENT_CAP = 5;

/**
 * Text as the search compares it: lowercase, unaccented, apostrophes gone so
 * "Miner's" is "miners", and everything else that is not a letter or a digit
 * turned into one space, so "poe.ninja" is the two words a player types.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (text: string) => (text ? text.split(" ") : []);

/**
 * Words that say nothing about which tool is meant. Every query has to match
 * on all of its words, so "poe regex" with "poe" kept would lose the two regex
 * pages of this site whose names do not say PoE. A query that is nothing but
 * these keeps them, since "poe" on its own is still a question.
 */
const STOP = new Set(
  "a an the of for to in on and or is are do does i my me how what which where can with this that it you your poe path exile tool tools site page".split(
    " ",
  ),
);

export function tokenize(query: string): string[] {
  const all = [...new Set(words(normalize(query)))];
  const kept = all.filter((w) => !STOP.has(w));
  return kept.length > 0 ? kept : all;
}

const slugify = (name: string) => normalize(name).replace(/ /g, "-");

type Draft = Omit<SearchEntry, "text"> & {
  blurb: string;
  body: string;
};

function finish(draft: Draft): SearchEntry {
  const { blurb, body, ...rest } = draft;
  const title = normalize(draft.title);
  const normalBody = normalize(body);
  return {
    ...rest,
    text: {
      title,
      titleWords: words(title),
      aliases: draft.aliases.map((a) => words(normalize(a))),
      topicTerms: draft.topics.flatMap((id) => {
        const topic = topicById(id);
        return [topic.label, ...topic.aliases].map((term) => {
          const normal = normalize(term);
          return { topic: id, term: normal, words: words(normal) };
        });
      }),
      blurbWords: words(normalize(blurb)),
      body: normalBody,
      bodyWords: words(normalBody),
    },
  };
}

function pageEntry(tool: SiteTool, order: number): SearchEntry {
  return finish({
    id: `page:${tool.slug}`,
    kind: "page",
    target: { kind: "page", slug: tool.slug },
    title: tool.label,
    subtitle: tool.blurb,
    icon: tool.icon,
    external: false,
    topics: tool.topics,
    aliases: tool.aliases ?? [],
    order,
    blurb: tool.blurb,
    body: tool.about,
  });
}

function linkEntry(tool: ExternalTool, order: number): SearchEntry {
  return finish({
    id: `link:${slugify(tool.name)}`,
    kind: "link",
    target: { kind: "link", name: tool.name },
    title: tool.name,
    subtitle: tool.blurb,
    icon: tool.icon,
    external: true,
    topics: tool.topics,
    aliases: tool.aliases ?? [],
    order,
    blurb: tool.blurb,
    body: tool.about,
  });
}

/** The questions, under the page each set is answered on. */
const FAQS: readonly [page: "home" | string, faqs: readonly Faq[]][] = [
  ["home", HOME_FAQ],
  ["beasts", BEASTS_FAQ],
  ["maps", MAPS_FAQ],
  ["scarabs", SCARABS_FAQ],
  ["leveling", LEVELING_FAQ],
];

function faqEntry(page: string, faq: Faq, index: number, order: number) {
  const subtitle = page === "home" ? "Home" : mustTool(page).label;
  return finish({
    id: `faq:${page}:${index}`,
    kind: "faq",
    target: { kind: "faq", page, index },
    title: faq.question,
    subtitle,
    icon: null,
    external: false,
    topics: [],
    aliases: [],
    order,
    blurb: "",
    body: faq.answer,
  });
}

function nodeEntry(node: ScarabNode, order: number): SearchEntry {
  return finish({
    id: `node:${node.id}`,
    kind: "node",
    target: { kind: "node", id: node.id },
    title: node.notable,
    subtitle: node.effect,
    icon: { src: `/atlas/${node.id}.png`, rounded: true },
    external: false,
    topics: [],
    aliases: [...node.prefixes, ...(node.aliases ?? [])],
    order,
    blurb: "",
    body: node.effect,
  });
}

function mustTool(slug: string) {
  const tool = toolBySlug(slug);
  if (!tool) throw new Error(`No tool at /${slug}`);
  return tool;
}

/**
 * Every record the search reads, built once.
 *
 * The tools come in the sidebar's order, since that is the order the palette
 * shows them in before anything is typed, and a page the sidebar does not list
 * comes after them: unlisted means in no menu, and it is still a page a query
 * can land on.
 */
export function buildIndex(): SearchIndex {
  const entries: SearchEntry[] = [];
  SIDEBAR_ENTRIES.forEach((entry, order) => {
    entries.push(
      entry.kind === "page"
        ? pageEntry(entry.page, order)
        : linkEntry(entry.link, order),
    );
  });
  for (const tool of SITE_TOOLS) {
    if (tool.unlisted) entries.push(pageEntry(tool, entries.length));
  }
  let order = 0;
  for (const [page, faqs] of FAQS) {
    faqs.forEach((faq, index) => {
      entries.push(faqEntry(page, faq, index, order++));
    });
  }
  [...EXCLUSIONS, ...BOOSTS].forEach((node, i) => {
    entries.push(nodeEntry(node, i));
  });
  return { entries, byId: new Map(entries.map((e) => [e.id, e])) };
}

export const SEARCH_INDEX: SearchIndex = buildIndex();

type Field = "title" | "alias" | "topic" | "blurb" | "body" | "fuzzy";

/**
 * The best a single word of the query did against one record, and whether it
 * was in the title at all, since a title hit that a subject outscores is still
 * a title hit and needs no explaining.
 */
type Best = {
  score: number;
  field: Field;
  inTitle: boolean;
  topic?: TopicId;
  alias?: string;
};

const NONE: Best = { score: 0, field: "body", inTitle: false };

/**
 * How one word of the query scores against one record, as the best of every
 * place it could have landed.
 *
 * The weights are an order, not a measurement: the title outranks an alias,
 * which outranks a subject, which outranks the blurb, which outranks the
 * description, and within a field an exact word outranks a prefix outranks a
 * fragment. A word of one or two letters only ever matches a whole word, or
 * "ap" would light up every map.
 */
function scoreToken(entry: SearchEntry, token: string): Best {
  const t = entry.text;
  const short = token.length <= 2;
  let best: Best = NONE;
  let inTitle = false;
  const offer = (score: number, field: Field, extra?: Partial<Best>) => {
    if (field === "title") inTitle = true;
    if (score > best.score) best = { score, field, inTitle, ...extra };
  };

  if (t.title === token) offer(100, "title");
  else if (short) {
    if (t.titleWords.includes(token)) offer(70, "title");
  } else if (t.title.startsWith(token)) offer(80, "title");
  else if (t.titleWords.some((w) => w.startsWith(token))) offer(70, "title");
  else if (token.length >= 3 && t.title.includes(token)) offer(50, "title");

  t.aliases.forEach((aliasWords, i) => {
    const alias = { alias: entry.aliases[i] };
    if (aliasWords.join(" ") === token) offer(90, "alias", alias);
    else if (
      short
        ? aliasWords.includes(token)
        : aliasWords.some((w) => w.startsWith(token))
    )
      offer(60, "alias", alias);
  });

  for (const term of t.topicTerms) {
    const topic = { topic: term.topic };
    if (term.term === token) offer(85, "topic", topic);
    else if (
      short
        ? term.words.includes(token)
        : term.words.some((w) => w.startsWith(token))
    )
      offer(65, "topic", topic);
  }

  if (!short) {
    if (t.blurbWords.some((w) => w.startsWith(token))) offer(35, "blurb");
    if (t.bodyWords.some((w) => w.startsWith(token))) offer(20, "body");
    else if (token.length >= 4 && t.body.includes(token)) offer(10, "body");
  }
  return { ...best, inTitle };
}

/**
 * Whether two strings are one edit apart: a letter added, dropped, changed or
 * swapped with its neighbour. The one kind of typo worth forgiving.
 */
function within1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return (
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2)
    );
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.slice(i) === l.slice(i + 1);
}

/**
 * A typo's worth of tolerance, against the names and the subjects only, and
 * against the start of a longer word so a typo made while still typing counts
 * too. Never against the descriptions: a sentence has enough words one letter
 * away from anything. And never for a short word, since every two letters are
 * one edit from some other two.
 */
function fuzzyToken(entry: SearchEntry, token: string): Best {
  if (token.length < 4) return NONE;
  const t = entry.text;
  const candidates = [
    ...t.titleWords,
    ...t.aliases.flat(),
    ...t.topicTerms.flatMap((term) => term.words),
  ];
  const near = candidates.some(
    (w) =>
      w[0] === token[0] &&
      (within1(token, w) ||
        within1(token, w.slice(0, token.length)) ||
        within1(token, w.slice(0, token.length + 1))),
  );
  return near ? { score: 30, field: "fuzzy", inTitle: false } : NONE;
}

const GROUPS: readonly {
  id: SearchGroupId;
  label: string;
  kinds: readonly SearchEntry["kind"][];
}[] = [
  { id: "tools", label: "Tools", kinds: ["page", "link"] },
  { id: "questions", label: "Questions", kinds: ["faq"] },
  { id: "nodes", label: "Atlas passives", kinds: ["node"] },
];

function group(hits: Hit[], cap = true): SearchGroup[] {
  return GROUPS.flatMap(({ id, label, kinds }) => {
    const mine = hits
      .filter((h) => kinds.includes(h.entry.kind))
      .sort((a, b) => b.score - a.score || a.entry.order - b.entry.order)
      .slice(0, cap ? GROUP_CAPS[id] : undefined);
    return mine.length > 0 ? [{ id, label, hits: mine }] : [];
  });
}

/**
 * What a query finds, in groups, best first.
 *
 * Every word of the query has to land somewhere in a record for it to count,
 * and the record's score is what its best places add up to. On top of that a
 * query that is a record's whole title, or a whole subject, or appears in a
 * title as a phrase, is lifted above one that merely shares its words. Typos
 * are forgiven only for a word that found nothing at all as typed, so a real
 * word is never joined by its near misses.
 *
 * Nothing typed is the sidebar again: every listed tool, in its order.
 */
export function search(index: SearchIndex, query: string): SearchGroup[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    const listed = index.entries.filter(
      (e) =>
        (e.kind === "page" || e.kind === "link") &&
        e.order < SIDEBAR_ENTRIES.length,
    );
    return group(
      listed.map((entry) => ({ entry, score: 0 })),
      false,
    );
  }

  const phrase = normalize(query);
  const bests = index.entries.map((entry) =>
    tokens.map((token) => scoreToken(entry, token)),
  );
  tokens.forEach((token, i) => {
    if (bests.some((row) => row[i].score > 0)) return;
    index.entries.forEach((entry, e) => {
      bests[e][i] = fuzzyToken(entry, token);
    });
  });

  const hits: Hit[] = [];
  index.entries.forEach((entry, e) => {
    const row = bests[e];
    if (row.some((b) => b.score === 0)) return;

    let score = row.reduce((sum, b) => sum + b.score, 0);
    if (tokens.length > 1 && row.every((b) => b.field === row[0].field)) {
      score += 15;
    }
    if (entry.text.title === phrase) score += 60;
    else if (tokens.length > 1 && entry.text.title.includes(phrase)) score += 30;
    if (entry.text.topicTerms.some((t) => t.term === phrase)) score += 40;

    let reason: string | undefined;
    if (!row.some((b) => b.inTitle)) {
      const topic = row.find((b) => b.field === "topic")?.topic;
      const alias = row.find((b) => b.field === "alias")?.alias;
      reason = topic ? topicById(topic).label : alias;
    }
    hits.push({ entry, score, reason });
  });
  return group(hits);
}

/**
 * The URL a hit opens, given the league the page is looking at as both the
 * path segment and the name the game spells it with, since the tools of this
 * site take the one and the links out take the other.
 */
export function entryHref(
  entry: SearchEntry,
  at: { slug: string; league: string },
): { href: string; external: boolean } {
  const target = entry.target;
  switch (target.kind) {
    case "page":
      return {
        href: toolHref(mustTool(target.slug), at.slug),
        external: false,
      };
    case "link":
      return { href: toolByName(target.name).href(at.league), external: true };
    case "faq": {
      const anchor = `#faq-${target.index + 1}`;
      const page =
        target.page === "home" ? "/" : toolHref(mustTool(target.page), at.slug);
      return { href: `${page}${anchor}`, external: false };
    }
    case "node":
      return {
        href: `${toolHref(mustTool("scarabs"), at.slug)}#${target.id}`,
        external: false,
      };
  }
}

/** The list of what was opened, newest first, with nothing in it twice. */
export function remember(
  recent: readonly string[],
  id: string,
  cap: number = RECENT_CAP,
): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, cap);
}
