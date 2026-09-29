# Path of Tools

**Live: <https://www.pathoftools.app>**

Path of Tools is a free directory of Path of Exile tools. It lists the tools
the community actually relies on, from the trade site, loot filters and build
planners to price checkers, regex generators and guides, each with a sentence
saying what it is for and a link straight to it. Alongside the directory it
hosts a few tools of its own, built by
[Maximilian Kielholz](https://maximiliankielholz.de) for problems no other tool
solved well: selling Bestiary beasts, pricing the scarab passives of the Atlas
tree, and following the campaign without a second monitor.

Everything on the site is for Path of Exile 1. It needs no account, runs no
ads and stores nothing about visitors. Prices come from the poe.ninja economy
API and the official trade site and are at most 15 minutes old.

## Tools built here

### Beast Regex (`/beasts/<league>`)

- Every beast on the market for the chosen league, with chaos value, seven day
  change and listing count, sortable and filterable by name, genus or habitat.
- Red or yellow minimap marker per beast.
- Sell or Trash mode with a chaos threshold (presets 1 to 5, or any number),
  and the Bestiary searches for that selection, ready to paste, never longer
  than the 249 character limit of the in game field.
- Sell mode as one run in up to three steps: release the cheap beasts in the
  way, sell everything from the threshold up, bulk sell the pile sitting on the
  threshold.
- Scarab prices for a beast farming map and the current divine rate beside the
  table.

Details: [docs/beast-regex.md](docs/beast-regex.md). In game test log for the
search field: [docs/bestiary-search.md](docs/bestiary-search.md).

### Scarab Nodes (`/scarabs/<league>`)

- The twelve Atlas notables that turn a mechanic off, ranked by the scarab
  value you give up, cheapest first.
- The nine Carapace notables that double a scarab family's drop chance, ranked
  by what the family's next drop is worth, dearest first.
- Every scarab of each family with its price and its share of the family's
  drops, from the game's five rarity tiers.

Details: [docs/scarab-nodes.md](docs/scarab-nodes.md).

### PoE Leveling Guide (`/leveling`)

- The download page for a free, MIT licensed Windows overlay that shows the
  next campaign step inside the game and advances on its own by reading the
  zone changes in `Client.txt`.
- Installer and portable zip, with the release pinned in
  `src/lib/leveling-app.ts`. The app lives in
  [mkj777/poe-leveling-app](https://github.com/mkj777/poe-leveling-app).

Details: [docs/leveling-guide.md](docs/leveling-guide.md).

### Map Regex (`/maps/<league>`, unlisted)

- Tick the map modifiers your build cannot run and get one stash search that
  lights up only the maps without them, with optional minimums for quantity,
  rarity and pack size.
- Reachable by URL and in the sitemap, but in no menu yet.

Details: [docs/map-regex.md](docs/map-regex.md). In game test log for the stash
search: [docs/stash-search.md](docs/stash-search.md).

## The directory

The home page and the sidebar are drawn from the same list in
`src/lib/nav.ts`, in three groups: Essentials (what a session is spent in),
General (what every character reaches for at some point) and Specific (one tool
for one mechanic). External tools are described in `src/lib/tools.ts`, and the
pages built here sit among them with a small "Built here" tag.

A command palette (the field at the top of the sidebar, or Ctrl+K) searches
every tool, every question and every Atlas passive. It answers to what a tool is
about, not only to its name: each tool declares subjects from
`src/lib/topics.ts`, and each subject carries the words players type for it, so
"skill tree" finds Path of Building, the jewel calculators and the Atlas
passives. The ranking lives in `src/lib/search.ts` and is pinned by
`test/search.test.ts`.

## URLs

```
/                             the directory: every tool, with a sentence each
/beasts/<league>              beast prices and the Bestiary searches
/beasts/<league>/simulation   a mock Bestiary window, unfinished and noindex
/scarabs/<league>             what each scarab Atlas passive is worth
/maps/<league>                the map stash search, unlisted
/leveling                     the leveling overlay download
/llms.txt, /llms-full.txt     the site as markdown for language models
/sitemap.xml, /robots.txt
```

The league is picked on the page. The bare tool paths (`/beasts`, `/scarabs`,
`/maps`) redirect to the current league, and the old league first URLs
(`/<league>`) redirect to the beasts.

## Search engines and answer engines

Everything a crawler reads is built from two files and tested without a build
in `test/seo.test.ts`:

- `src/lib/site.ts`: the origin, the site description and the author.
- `src/lib/seo.ts`: the sitemap, the robots rules, `/llms.txt`,
  `/llms-full.txt` and every schema.org block.

Each page sets its own title, description, canonical and Open Graph block
(Twitter cards inherit from Open Graph). The root layout renders an
`Organization`, a `WebSite` and the author `Person`. Each tool page adds a
`WebApplication` (or `SoftwareApplication` for the leveling download) with the
author as creator, a `BreadcrumbList`, and an `FAQPage` whose questions are the
ones printed on the page. The questions live in `src/lib/faq.ts`; the "what it
does and how to use it" prose on each tool page lives in `src/lib/guides.ts`,
and both are reused in the llms files so the page and the file say the same
thing. The home page adds an `ItemList` of the directory.

`robots.txt` allows everything but `/api/` and names the AI crawlers (GPTBot,
OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, CCBot
and others) explicitly. The sitemap lists the home page, the leveling page and
every league page of every league tool, current league first; redirecting paths
are left out.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 and shadcn/ui on Radix, lucide icons, cmdk for the palette
- Vercel hosting with a daily cron, Vercel Analytics and Speed Insights
- Tests on `node --test` with Node's built in TypeScript stripping, no
  framework

The palette is four steps of one cold grey, defined once as shadcn tokens in
`src/app/globals.css`. Red, green and amber appear only where they mean
something: the altar, the sale and a warning.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm test     # includes the regex tests against a real 218 beast fixture
pnpm build
```

### Data update scripts

The generators check against data scraped from GGG, poe.ninja and the wiki. It
is committed, and refreshed by hand when a patch changes it:

| Script | Writes | Source |
| --- | --- | --- |
| `pnpm mods:update` | `src/lib/bestiary-mods.ts` | poewiki list of Bestiary modifiers |
| `pnpm mods:monsters` | `src/lib/monster-mods.ts` | generic rare monster modifiers |
| `pnpm mods:maps` | `src/lib/map-mods.ts` | every modifier a map can roll |
| `pnpm words:update <words.json>` | `src/lib/monster-words.ts` | a Words.dat export from poe-dat-viewer |
| `pnpm rarity:update` | `src/lib/beast-rarity.ts` | which beasts are red, from the wiki |
| `pnpm scarabs:tiers` | `src/lib/scarab-tiers.ts` | scarab rarity tiers from the wiki |
| `pnpm atlas:icons` | `public/atlas/*.png` | Atlas passive art, GGG tree export plus wiki |
| `pnpm prices:snapshot` | `src/lib/trade-prices.fallback.json` | trade site prices for beasts poe.ninja skips (about an hour, rate limited) |

## Deploy

The site runs on Vercel and deploys automatically on every push to `main`.
Price pages use ISR with a 15 minute revalidate (the beasts page renders per
visit), so new prices arrive without a deploy and a new league appears on its
first visit.

`vercel.json` schedules `/api/refresh-prices` once a day. It tops up the trade
site prices for the beasts poe.ninja does not list, ten at a time, well inside
GGG's rate limits.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The public origin, `https://www.pathoftools.app`. Without it canonicals fall back to the `*.vercel.app` host. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Renders the Search Console verification tag when set. |
| `CRON_SECRET` | Locks down the cron route. |
| `PRICE_REFRESH_SLICE`, `PRICE_REFRESH_SPACING_MS` | Tune how many beasts a cron run prices and how far apart. |

## Author

Built by [Maximilian Kielholz](https://maximiliankielholz.de)
([GitHub](https://github.com/mkj777)). Path of Tools is a fan project and is
not affiliated with Grinding Gear Games.
