# Multi-tool Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-purpose beast price site into a multi-tool site with a shared top navigation bar, and put an empty Wealth route behind it.

**Architecture:** A new server layout at `src/app/[league]/layout.tsx` fetches the league list once and renders a client navigation bar above every page under `/[league]`. The bar owns the tool tabs and the league select, so the beasts page gives up its gutter copies of both. Which tool is active and where a league switch leads are decided by two pure functions in `src/lib/nav.ts`, which are the only part with tests.

**Tech Stack:** Next.js 16.3.1 App Router, React 19, Tailwind v4, shadcn/ui, TypeScript, `node --test`.

**Spec:** `docs/superpowers/specs/2026-08-18-wealth-tracker-design.md`

## Global Constraints

- **No em-dash (U+2014) anywhere**: code, UI copy, comments, commit messages, docs. Use a comma, colon, full stop or brackets. En-dash (–) is allowed for ranges. This is a hard rule from `CLAUDE.md`.
- **This is not the Next.js in your training data.** Read `node_modules/next/dist/docs/` before writing route or layout code. Typed helpers `PageProps<"/[league]">` and `LayoutProps<"/[league]">` are globals, not imports.
- `params` is a Promise and must be awaited.
- Tests run with `npm test`, which is `node --test "test/**/*.test.ts"`. Node strips types, so relative imports inside tests carry the real `.ts` extension: `import { x } from "../src/lib/nav.ts"`.
- Lint with `npm run lint` (plain `eslint`). `npx next lint --file` does not exist in this version.
- No new dependencies in this plan.
- Existing URLs must not change: `/[league]` stays the beasts page, prerendered with `revalidate = 900` and `generateStaticParams`.

---

### Task 1: Navigation helpers

**Files:**
- Create: `src/lib/nav.ts`
- Create: `test/nav.test.ts`

**Interfaces:**
- Produces: `TOOLS: readonly Tool[]` where `type Tool = { slug: string; label: string }`, `toolHref(leagueSlug: string, tool: string): string`, `activeTool(pathname: string): string`, `swapLeague(pathname: string, nextSlug: string): string`.
- The empty string is the beasts tool. `toolHref("allflame", "")` is `/allflame`; `toolHref("allflame", "wealth")` is `/allflame/wealth`.

- [ ] **Step 1: Write the failing test**

```ts
// test/nav.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS, activeTool, swapLeague, toolHref } from "../src/lib/nav.ts";

test("beasts is the tool with the empty slug", () => {
  assert.equal(TOOLS[0].slug, "");
  assert.equal(TOOLS[0].label, "Beasts");
  assert.ok(TOOLS.some((t) => t.slug === "wealth"));
});

test("toolHref builds the path for a tool", () => {
  assert.equal(toolHref("allflame", ""), "/allflame");
  assert.equal(toolHref("allflame", "wealth"), "/allflame/wealth");
});

test("activeTool reads the tool out of a pathname", () => {
  assert.equal(activeTool("/allflame"), "");
  assert.equal(activeTool("/allflame/"), "");
  assert.equal(activeTool("/allflame/wealth"), "wealth");
  assert.equal(activeTool("/allflamehc/wealth"), "wealth");
});

test("activeTool ignores a segment that is not a tool", () => {
  // The simulation is its own page, not a tool tab.
  assert.equal(activeTool("/allflame/simulation"), "");
});

test("swapLeague keeps the tool", () => {
  assert.equal(swapLeague("/allflame/wealth", "standard"), "/standard/wealth");
  assert.equal(swapLeague("/allflame", "standard"), "/standard");
});

test("swapLeague sends an unknown page back to that tool's root", () => {
  assert.equal(swapLeague("/allflame/simulation", "standard"), "/standard");
});

test("swapLeague survives an empty pathname", () => {
  assert.equal(swapLeague("", "standard"), "/standard");
  assert.equal(swapLeague("/", "standard"), "/standard");
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/nav.ts`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/nav.ts

/** A tool is one tab in the bar. The beasts table is the tool at the root. */
export type Tool = { slug: string; label: string };

export const TOOLS: readonly Tool[] = [
  { slug: "", label: "Beasts" },
  { slug: "wealth", label: "Wealth" },
] as const;

const segments = (pathname: string) => pathname.split("/").filter(Boolean);

export function toolHref(leagueSlug: string, tool: string) {
  return tool ? `/${leagueSlug}/${tool}` : `/${leagueSlug}`;
}

/**
 * Which tab to light up. Pages that are not tools, the simulation for one,
 * belong to the tool they hang under, which today is always the beasts table.
 */
export function activeTool(pathname: string) {
  const tool = segments(pathname)[1] ?? "";
  return TOOLS.some((t) => t.slug === tool) ? tool : "";
}

/** The same tool in another league, which is what the league select means. */
export function swapLeague(pathname: string, nextSlug: string) {
  return toolHref(nextSlug, activeTool(pathname));
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS, and the existing bestiary tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts test/nav.test.ts
git commit -m "Work out which tool a path belongs to, and where a league switch leads"
```

---

### Task 2: The navigation bar

**Files:**
- Create: `src/components/site-nav.tsx`
- Modify: `src/components/league-select.tsx`

**Interfaces:**
- Consumes: `TOOLS`, `activeTool`, `toolHref`, `swapLeague` from Task 1.
- Produces: `<SiteNav leagues={League[]} league={string} />`, a client component. `LeagueSelect` gains an optional `to?: (slug: string) => string` prop, defaulting to the current behaviour so the existing call site keeps working.

- [ ] **Step 1: Generalise `LeagueSelect`**

The select currently hardcodes where a league switch goes. The bar needs it to keep the tool.

```tsx
// src/components/league-select.tsx, replacing the props and the handler
export function LeagueSelect({
  leagues,
  value,
  className = "w-[220px]",
  to = (slug: string) => `/${slug}`,
}: {
  leagues: League[];
  value: string;
  className?: string;
  /** Where picking a league leads. The bar keeps the current tool. */
  to?: (slug: string) => string;
}) {
  const router = useRouter();

  return (
    <Select
      value={value}
      onValueChange={(id) => router.push(to(leagueSlug(id)))}
    >
```

The rest of the file is unchanged.

- [ ] **Step 2: Write the bar**

```tsx
// src/components/site-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords } from "lucide-react";
import { LeagueSelect } from "@/components/league-select";
import { TOOLS, activeTool, swapLeague, toolHref } from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";
import { cn } from "@/lib/utils";

/**
 * One bar over every tool. The league select stays on the right and keeps
 * whichever tool is open, so switching league never also switches page.
 */
export function SiteNav({
  leagues,
  league,
}: {
  leagues: League[];
  league: string;
}) {
  const pathname = usePathname() ?? "";
  const current = activeTool(pathname);
  const slug = leagueSlug(league);

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Swords className="size-4" />
          PoE Tools
        </span>

        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={toolHref(slug, tool.slug)}
              aria-current={tool.slug === current ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tool.slug === current
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {tool.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto">
          <LeagueSelect
            leagues={leagues}
            value={league}
            className="w-[180px]"
            to={(next) => swapLeague(pathname, next)}
          />
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean. If `Swords` is missing from `lucide-react`, pick another icon that exists in the installed version rather than adding a dependency.

- [ ] **Step 4: Commit**

```bash
git add src/components/site-nav.tsx src/components/league-select.tsx
git commit -m "Give the site one bar for tools and leagues"
```

---

### Task 3: Layout, Wealth stub, and the beasts page cleanup

**Files:**
- Create: `src/app/[league]/layout.tsx`
- Create: `src/app/[league]/wealth/page.tsx`
- Modify: `src/app/[league]/page.tsx` (the gutter block that holds `LeagueSelect` and `SimulationLink`)

**Interfaces:**
- Consumes: `<SiteNav>` from Task 2, `resolveLeague` from `src/lib/league.ts`.
- Produces: every page under `/[league]` renders inside the bar. `/[league]/wealth` exists and answers, so the tab is not a dead link.

- [ ] **Step 1: Write the layout**

```tsx
// src/app/[league]/layout.tsx
import { notFound } from "next/navigation";
import { resolveLeague } from "@/lib/league";
import { SiteNav } from "@/components/site-nav";

/** Same window as the pages under it, so a new league appears in the bar. */
export const revalidate = 900;

export default async function LeagueLayout({
  children,
  params,
}: LayoutProps<"/[league]">) {
  const { leagues, league } = await resolveLeague((await params).league);
  if (!league) notFound();

  return (
    <>
      <SiteNav leagues={leagues} league={league} />
      {children}
    </>
  );
}
```

- [ ] **Step 2: Write the Wealth stub**

```tsx
// src/app/[league]/wealth/page.tsx
export const metadata = {
  title: "Wealth",
  description: "What your stash tabs are worth, tracked over time.",
};

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-10 pb-12">
      <h1 className="text-2xl font-semibold">Wealth</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Link a Path of Exile account, pick the stash tabs that count, and watch
        what they are worth. Not built yet.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Take the duplicates out of the beasts page**

In `src/app/[league]/page.tsx`, the left gutter column currently holds the logo, a `LeagueSelect` and a `SimulationLink`. The select moves to the bar, so delete it and its now unused import. Keep the logo and keep `SimulationLink`, which is not a tool: it belongs to the beasts page.

The gutter block becomes:

```tsx
        <div
          className="pointer-events-auto shrink-0 space-y-3"
          style={{ width: "max(9rem, calc((100% - 72rem) / 2 + 1.5rem))" }}
        >
          <Image
            src="/poe_logo.png"
            alt="Path of Exile"
            width={800}
            height={578}
            priority
            className="h-auto w-full"
          />
          <div className="px-3">
            <SimulationLink league={league} />
          </div>
        </div>
```

Delete the `import { LeagueSelect } from "@/components/league-select";` line. Leave `leagues` out of the destructuring if nothing else uses it: `const { league } = await resolveLeague((await params).league);`.

- [ ] **Step 4: Check the absolute row still clears the bar**

The gutter row is `min-[1480px]:absolute ... top-0`, which now measures from below the sticky bar because the layout wraps it. Open the page and confirm the logo does not slide under the bar. If it does, change `min-[1480px]:top-0` to `min-[1480px]:top-2` rather than touching the geometry comment above it.

Run: `npm run dev`, then visit `http://localhost:3000/allflame` and `http://localhost:3000/allflame/wealth`.
Expected: the bar sits on both, Beasts is highlighted on the first and Wealth on the second, the league select keeps the tool when switched, and the beast table is unchanged.

- [ ] **Step 5: Typecheck, lint, test, build**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all clean. The build must still prerender `/[league]` for every live league; if it turns dynamic, the cause is the layout, not the page.

- [ ] **Step 6: Commit**

```bash
git add src/app/[league]/layout.tsx src/app/[league]/wealth/page.tsx src/app/[league]/page.tsx
git commit -m "Hang both tools off one layout, and stop the beasts page repeating the bar"
```

---

## Self-Review

**Spec coverage.** The spec's Navigation section asks for a client bar with a mark, tool tabs, and the league select on the right, with the beasts page giving up its gutter select and simulation link. Task 2 and Task 3 cover it, with one deliberate deviation: `SimulationLink` stays on the beasts page. It is not a tool, it is a page belonging to that tool, and moving it into the bar would put a beasts-only link over the Wealth page. The spec's routing table is covered by Task 3, and the promise that `/[league]` keeps its prerendering is checked in Task 3 Step 5.

**Placeholders.** None: every step carries the code it needs. The one judgement call left to the implementer is the icon name in Task 2 Step 3, which is bounded by an instruction not to add a dependency.

**Type consistency.** `TOOLS`, `toolHref`, `activeTool` and `swapLeague` are defined in Task 1 and used with those exact names and signatures in Task 2. `LeagueSelect`'s new `to` prop is defined in Task 2 Step 1 and used in Task 2 Step 2. `SiteNav`'s props match the layout's call in Task 3.
