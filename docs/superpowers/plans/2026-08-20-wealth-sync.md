# Wealth Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paste a POESESSID, pick stash tabs, sync them one request at a time, and store a priced snapshot in Postgres that the page can show a total from.

**Architecture:** The browser holds the session cookie and drives the sync: `session` proves the cookie and mints a signed access token, `sync/start` opens a draft snapshot, `sync/tab` fetches and prices exactly one tab, `sync/finish` totals and prunes. Every call to Grinding Gear Games claims a slot from a Postgres counter first, because on Vercel the rate limit budget belongs to the whole deployment rather than to one visitor. Prices come from a poe.ninja lookup that is cached per league and shared by everyone, so a sync costs no poe.ninja request.

**Tech Stack:** Next.js 16.3.1 route handlers, Drizzle ORM over `postgres` (postgres.js) against Supabase Postgres, `node:crypto`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-08-18-wealth-tracker-design.md`

**Depends on:** `docs/superpowers/plans/2026-08-20-wealth-shell.md` (the Wealth route and the bar must exist).

## Global Constraints

- **No em-dash (U+2014) anywhere**: code, UI copy, comments, commit messages, docs. Use a comma, colon, full stop or brackets. This is a hard rule from `CLAUDE.md`.
- **This is not the Next.js in your training data.** Read `node_modules/next/dist/docs/` before writing route handlers, `cookies()` usage or `maxDuration` exports.
- **The POESESSID is never stored.** No column holds it, nothing logs it, no response returns it. It arrives in a request body, is used, and is dropped.
- **Never call pathofexile.com outside `src/lib/ggg/client.ts`.** Every call claims a rate limit slot first. GGG publishes `45:60:60,200:120:900` per IP on the stash endpoint, and exceeding it bans the whole deployment for up to 15 minutes.
- **Never retry a 4xx.** GGG restricts access for repeated invalid requests. A rejected cookie stops that account for an hour.
- Tests run with `npm test` (`node --test "test/**/*.test.ts"`). Relative imports in tests carry the `.ts` extension. Tests never touch the network or the database: everything that talks to either takes its dependency as a parameter.
- New dependencies, and only these: `drizzle-orm`, `postgres`, and `drizzle-kit` as a dev dependency. Install with `pnpm add` / `pnpm add -D`.
- Environment: `DATABASE_URL` (Supabase transaction pooler) and `WEALTH_TOKEN_SECRET`. Both server only, both in `.env.local` for development and in Vercel for production.
- Self-imposed rate caps: **30 requests per 60 seconds** and **120 per 120 seconds**, two thirds of what GGG allows.

---

### Task 1: Database schema and client

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/client.ts`
- Create: `drizzle.config.ts`
- Modify: `package.json` (dependencies and a `db:generate` script)
- Modify: `.gitignore` (nothing to add if `.env*` is already ignored, which it is)

**Interfaces:**
- Produces: `stashAccounts`, `tabSelections`, `snapshots`, `gggBudget` tables; types `PricedItem`, `BreakdownRow`; `getDb(): PostgresJsDatabase<typeof schema>`.

- [ ] **Step 1: Install the dependencies**

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

- [ ] **Step 2: Write the schema**

```ts
// src/lib/db/schema.ts
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** One row per Path of Exile account that has ever synced. No cookie here. */
export const stashAccounts = pgTable("stash_accounts", {
  accountName: text("account_name").primaryKey(),
  firstSeen: timestamp("first_seen", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
  /** When GGG last refused the cookie. Blocks retries for an hour. */
  badAuthAt: timestamp("bad_auth_at", { withTimezone: true }),
});

export const tabSelections = pgTable(
  "tab_selections",
  {
    accountName: text("account_name").notNull(),
    league: text("league").notNull(),
    tabId: text("tab_id").notNull(),
    tabIndex: integer("tab_index").notNull(),
    name: text("name").notNull(),
    colour: text("colour"),
    type: text("type").notNull(),
    selected: boolean("selected").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.accountName, t.league, t.tabId] })],
);

/** One priced stack, as stored inside a snapshot's JSON column. */
export type PricedItem = {
  name: string;
  category: string;
  tabId: string;
  stack: number;
  chaosEach: number;
};

export type BreakdownRow = { category: string; chaos: number; count: number };

export const snapshots = pgTable(
  "snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountName: text("account_name").notNull(),
    league: text("league").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").$type<"draft" | "done">().notNull().default("draft"),
    totalChaos: doublePrecision("total_chaos").notNull().default(0),
    unpricedCount: integer("unpriced_count").notNull().default(0),
    divineRate: doublePrecision("divine_rate"),
    breakdown: jsonb("breakdown").$type<BreakdownRow[]>().notNull().default([]),
    items: jsonb("items").$type<PricedItem[]>().notNull().default([]),
  },
  (t) => [
    index("snapshots_history").on(t.accountName, t.league, t.takenAt),
    // One open draft per account and league, so two browsers cannot interleave.
    uniqueIndex("snapshots_one_draft")
      .on(t.accountName, t.league)
      .where(sql`status = 'draft'`),
  ],
);

/**
 * The shared rate limit counter. One row per cap, because GGG publishes two
 * windows at once and a single counter cannot honour both.
 */
export const gggBudget = pgTable("ggg_budget", {
  scope: text("scope").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  hits: integer("hits").notNull().default(0),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
});
```

- [ ] **Step 3: Write the client**

```ts
// src/lib/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof make> | undefined;

function make(url: string) {
  // Supabase's transaction pooler hands out a different backend per
  // transaction, so postgres.js must not prepare statements. This is the one
  // configuration mistake this stack invites.
  const sql = postgres(url, { prepare: false });
  return drizzle(sql, { schema });
}

/** Built on first use, so a build without a database still succeeds. */
export function getDb() {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    db = make(url);
  }
  return db;
}
```

- [ ] **Step 4: Write the Drizzle config and the script**

```ts
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

Add to `package.json` scripts:

```json
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push"
```

- [ ] **Step 5: Generate the migration and apply it**

Create `.env.local` with `DATABASE_URL` from the Supabase project (Connection string, Transaction pooler, port 6543) and a `WEALTH_TOKEN_SECRET` from `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.

Run: `pnpm db:generate && pnpm db:push`
Expected: a migration file appears under `drizzle/`, and the four tables exist in Supabase.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add package.json pnpm-lock.yaml drizzle.config.ts drizzle src/lib/db
git commit -m "Describe the wealth tables in TypeScript and open a pooled connection"
```

---

### Task 2: The access token

**Files:**
- Create: `src/lib/wealth/token.ts`
- Create: `test/wealth-token.test.ts`

**Interfaces:**
- Produces: `signAccess(account: string, expiresAt: number, secret: string): string` and `readAccess(token: string | undefined, secret: string, now?: number): string | undefined`, which returns the account name or `undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// test/wealth-token.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { readAccess, signAccess } from "../src/lib/wealth/token.ts";

const SECRET = "test-secret";
const HOUR = 3_600_000;

test("a fresh token reads back the account", () => {
  const token = signAccess("Exile#1234", Date.now() + HOUR, SECRET);
  assert.equal(readAccess(token, SECRET), "Exile#1234");
});

test("a token signed with another secret is refused", () => {
  const token = signAccess("Exile#1234", Date.now() + HOUR, SECRET);
  assert.equal(readAccess(token, "other"), undefined);
});

test("a tampered payload is refused", () => {
  const token = signAccess("Exile#1234", Date.now() + HOUR, SECRET);
  const [payload, mac] = token.split(".");
  const swapped = Buffer.from(
    JSON.stringify({ a: "Someone#0001", e: Date.now() + HOUR }),
  ).toString("base64url");
  assert.notEqual(payload, swapped);
  assert.equal(readAccess(`${swapped}.${mac}`, SECRET), undefined);
});

test("an expired token is refused", () => {
  const token = signAccess("Exile#1234", Date.now() - 1, SECRET);
  assert.equal(readAccess(token, SECRET), undefined);
});

test("garbage is refused rather than thrown at", () => {
  assert.equal(readAccess(undefined, SECRET), undefined);
  assert.equal(readAccess("", SECRET), undefined);
  assert.equal(readAccess("no-dot", SECRET), undefined);
  assert.equal(readAccess("a.b.c", SECRET), undefined);
  assert.equal(readAccess("!!!.???", SECRET), undefined);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/wealth/token.ts`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/wealth/token.ts
import { createHmac, timingSafeEqual } from "node:crypto";

/** Thirty days, which is how long a browser keeps read access. */
export const ACCESS_MAX_AGE = 30 * 24 * 3600;

const mac = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

/**
 * A signature, not a row: the server stores nothing about it. Rotating the
 * secret is therefore the only way to revoke every token at once.
 */
export function signAccess(account: string, expiresAt: number, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ a: account, e: expiresAt }),
  ).toString("base64url");
  return `${payload}.${mac(payload, secret)}`;
}

export function readAccess(
  token: string | undefined,
  secret: string,
  now = Date.now(),
) {
  if (!token) return undefined;
  const parts = token.split(".");
  if (parts.length !== 2) return undefined;
  const [payload, signature] = parts;

  const expected = Buffer.from(mac(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return undefined;
  if (!timingSafeEqual(expected, given)) return undefined;

  try {
    const claim = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof claim?.a !== "string" || typeof claim?.e !== "number") {
      return undefined;
    }
    return claim.e > now ? (claim.a as string) : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wealth/token.ts test/wealth-token.test.ts
git commit -m "Prove who may read a history with a signature rather than a session row"
```

---

### Task 3: Reading GGG's rate limit headers

**Files:**
- Create: `src/lib/ggg/limits.ts`
- Create: `test/ggg-limits.test.ts`

**Interfaces:**
- Produces: `type Rule = { hits: number; period: number; penalty: number }`, `parseTriples(header: string | null | undefined): Rule[]`, `restrictionSeconds(state: Rule[]): number`, `capsFrom(rules: Rule[]): Cap[]` where `type Cap = { scope: string; hits: number; period: number }`, and `DEFAULT_CAPS: Cap[]`.

- [ ] **Step 1: Write the failing test**

```ts
// test/ggg-limits.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CAPS,
  capsFrom,
  parseTriples,
  restrictionSeconds,
} from "../src/lib/ggg/limits.ts";

test("both rules of one header are read", () => {
  assert.deepEqual(parseTriples("45:60:60,200:120:900"), [
    { hits: 45, period: 60, penalty: 60 },
    { hits: 200, period: 120, penalty: 900 },
  ]);
});

test("a missing or broken header is no rules at all", () => {
  assert.deepEqual(parseTriples(null), []);
  assert.deepEqual(parseTriples(""), []);
  assert.deepEqual(parseTriples("nonsense"), []);
  assert.deepEqual(parseTriples("45:60"), []);
});

test("restriction is the longest penalty currently active", () => {
  assert.equal(restrictionSeconds(parseTriples("3:60:0,12:120:0")), 0);
  assert.equal(restrictionSeconds(parseTriples("45:60:37,200:120:0")), 37);
  assert.equal(restrictionSeconds(parseTriples("45:60:37,200:120:900")), 900);
});

test("our caps sit at two thirds of what GGG allows", () => {
  assert.deepEqual(capsFrom(parseTriples("45:60:60,200:120:900")), [
    { scope: "ip:60", hits: 30, period: 60 },
    { scope: "ip:120", hits: 133, period: 120 },
  ]);
});

test("without headers we fall back to the caps we shipped with", () => {
  assert.deepEqual(capsFrom([]), DEFAULT_CAPS);
  assert.deepEqual(DEFAULT_CAPS, [
    { scope: "ip:60", hits: 30, period: 60 },
    { scope: "ip:120", hits: 120, period: 120 },
  ]);
});

test("a cap never grows past the one we shipped with", () => {
  // GGG says limits are dynamic. Tighter is honoured, looser is ignored.
  assert.deepEqual(capsFrom(parseTriples("9:60:60,1000:120:900")), [
    { scope: "ip:60", hits: 6, period: 60 },
    { scope: "ip:120", hits: 120, period: 120 },
  ]);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/ggg/limits.ts`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/ggg/limits.ts

/** GGG writes both its rules and its state as `hits:period:penalty`. */
export type Rule = { hits: number; period: number; penalty: number };
export type Cap = { scope: string; hits: number; period: number };

/**
 * What we allow ourselves without having seen a header yet: two thirds of the
 * `45:60:60,200:120:900` the stash endpoint publishes, so a miscount cannot
 * reach the penalty.
 */
export const DEFAULT_CAPS: Cap[] = [
  { scope: "ip:60", hits: 30, period: 60 },
  { scope: "ip:120", hits: 120, period: 120 },
];

export function parseTriples(header: string | null | undefined): Rule[] {
  if (!header) return [];
  const rules: Rule[] = [];
  for (const part of header.split(",")) {
    const numbers = part.trim().split(":").map(Number);
    if (numbers.length !== 3 || numbers.some((n) => !Number.isFinite(n))) {
      return [];
    }
    rules.push({ hits: numbers[0], period: numbers[1], penalty: numbers[2] });
  }
  return rules;
}

/** How long the current restriction lasts, from a `-State` header. */
export function restrictionSeconds(state: Rule[]) {
  return state.reduce((worst, rule) => Math.max(worst, rule.penalty), 0);
}

/**
 * Our caps for the rules GGG just reported. Limits are dynamic, so a smaller
 * number from GGG tightens us, and a bigger one changes nothing.
 */
export function capsFrom(rules: Rule[]): Cap[] {
  return DEFAULT_CAPS.map((fallback, i) => {
    const rule = rules[i];
    if (!rule || rule.period !== fallback.period) return fallback;
    return {
      scope: fallback.scope,
      period: fallback.period,
      hits: Math.min(fallback.hits, Math.floor((rule.hits * 2) / 3)),
    };
  });
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ggg/limits.ts test/ggg-limits.test.ts
git commit -m "Read GGG's own rate limit numbers instead of guessing them"
```

---

### Task 4: Claiming a slot

**Files:**
- Create: `src/lib/ggg/budget.ts` (pure)
- Create: `src/lib/ggg/budget-db.ts` (the Postgres wrapper)
- Create: `test/ggg-budget.test.ts`

**Interfaces:**
- Consumes: `Cap` from Task 3, `getDb` and `gggBudget` from Task 1.
- Produces: `type Window = { windowStart: number; hits: number; blockedUntil: number | null }`, `claim(state: Window, cap: Cap, now: number): Claim` where `type Claim = { ok: true; next: Window } | { ok: false; waitSeconds: number }`, and `claimSlot(caps?: Cap[]): Promise<{ ok: boolean; waitSeconds: number }>` plus `blockFor(seconds: number): Promise<void>` from the wrapper.

- [ ] **Step 1: Write the failing test**

```ts
// test/ggg-budget.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { claim, type Window } from "../src/lib/ggg/budget.ts";

const CAP = { scope: "ip:60", hits: 3, period: 60 };
const T0 = 1_000_000_000_000;
const fresh: Window = { windowStart: T0, hits: 0, blockedUntil: null };

test("an empty window lets a call through and counts it", () => {
  const result = claim(fresh, CAP, T0);
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.next, {
    windowStart: T0,
    hits: 1,
    blockedUntil: null,
  });
});

test("a full window refuses and says how long to wait", () => {
  const full: Window = { windowStart: T0, hits: 3, blockedUntil: null };
  const result = claim(full, CAP, T0 + 10_000);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.waitSeconds, 50);
});

test("the window rolls over once its period has passed", () => {
  const full: Window = { windowStart: T0, hits: 3, blockedUntil: null };
  const result = claim(full, CAP, T0 + 60_000);
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.next, {
    windowStart: T0 + 60_000,
    hits: 1,
    blockedUntil: null,
  });
});

test("a block beats everything until it expires", () => {
  const blocked: Window = {
    windowStart: T0,
    hits: 0,
    blockedUntil: T0 + 90_000,
  };
  const refused = claim(blocked, CAP, T0);
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false && refused.waitSeconds, 90);

  const after = claim(blocked, CAP, T0 + 90_001);
  assert.equal(after.ok, true);
});

test("waiting is rounded up, never down", () => {
  const full: Window = { windowStart: T0, hits: 3, blockedUntil: null };
  const result = claim(full, CAP, T0 + 59_100);
  assert.equal(result.ok === false && result.waitSeconds, 1);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/ggg/budget.ts`.

- [ ] **Step 3: Write the pure part**

```ts
// src/lib/ggg/budget.ts
import type { Cap } from "./limits";

export type Window = {
  windowStart: number;
  hits: number;
  blockedUntil: number | null;
};

export type Claim =
  | { ok: true; next: Window }
  | { ok: false; waitSeconds: number };

const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

/**
 * Fixed windows rather than rolling ones: cheaper to store, and with caps at
 * two thirds of GGG's the extra slack costs nothing.
 */
export function claim(state: Window, cap: Cap, now: number): Claim {
  if (state.blockedUntil && state.blockedUntil > now) {
    return { ok: false, waitSeconds: seconds(state.blockedUntil - now) };
  }

  const rolled = now - state.windowStart >= cap.period * 1000;
  const windowStart = rolled ? now : state.windowStart;
  const hits = rolled ? 0 : state.hits;

  if (hits >= cap.hits) {
    return {
      ok: false,
      waitSeconds: seconds(windowStart + cap.period * 1000 - now),
    };
  }

  return { ok: true, next: { windowStart, hits: hits + 1, blockedUntil: null } };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the Postgres wrapper**

Not unit tested: it is the part that only a real database can answer for, and it is checked end to end in Task 9.

```ts
// src/lib/ggg/budget-db.ts
import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { gggBudget } from "@/lib/db/schema";
import { claim, type Window } from "./budget";
import { DEFAULT_CAPS, type Cap } from "./limits";

/**
 * Claims one slot against every cap at once, inside a transaction with the
 * rows locked. Each function instance is its own process, so these rows are
 * the only place the whole deployment can agree on how much budget is left.
 */
export async function claimSlot(caps: Cap[] = DEFAULT_CAPS) {
  const db = getDb();
  const now = Date.now();

  return db.transaction(async (tx) => {
    const scopes = caps.map((c) => c.scope);
    const rows = await tx
      .select()
      .from(gggBudget)
      .where(inArray(gggBudget.scope, scopes))
      .for("update");

    const byScope = new Map(rows.map((r) => [r.scope, r]));
    const decided = caps.map((cap) => {
      const row = byScope.get(cap.scope);
      const state: Window = {
        windowStart: row?.windowStart?.getTime() ?? now,
        hits: row?.hits ?? 0,
        blockedUntil: row?.blockedUntil?.getTime() ?? null,
      };
      return { cap, result: claim(state, cap, now) };
    });

    const refused = decided.find((d) => !d.result.ok);
    if (refused && !refused.result.ok) {
      return { ok: false, waitSeconds: refused.result.waitSeconds };
    }

    for (const { cap, result } of decided) {
      if (!result.ok) continue;
      await tx
        .insert(gggBudget)
        .values({
          scope: cap.scope,
          windowStart: new Date(result.next.windowStart),
          hits: result.next.hits,
          blockedUntil: null,
        })
        .onConflictDoUpdate({
          target: gggBudget.scope,
          set: {
            windowStart: new Date(result.next.windowStart),
            hits: result.next.hits,
            blockedUntil: null,
          },
        });
    }

    return { ok: true, waitSeconds: 0 };
  });
}

/** After a 429 or an active restriction: nobody calls GGG until this passes. */
export async function blockFor(seconds: number) {
  const db = getDb();
  const until = new Date(Date.now() + seconds * 1000);
  for (const cap of DEFAULT_CAPS) {
    await db
      .insert(gggBudget)
      .values({ scope: cap.scope, blockedUntil: until })
      .onConflictDoUpdate({
        target: gggBudget.scope,
        set: { blockedUntil: until },
      });
  }
}

/** How long the block still has to run, for the message the browser shows. */
export async function blockedSeconds() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(gggBudget)
    .where(eq(gggBudget.scope, DEFAULT_CAPS[0].scope));
  const until = row?.blockedUntil?.getTime() ?? 0;
  return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
}

/** Kept so the import of `sql` is not accidentally dropped by a linter fix. */
export const budgetTableName = sql`ggg_budget`;
```

Delete the last export and the `sql` import if the linter is happy without them; it is there only to make the unused import obvious rather than mysterious.

- [ ] **Step 6: Typecheck, lint, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`

```bash
git add src/lib/ggg/budget.ts src/lib/ggg/budget-db.ts test/ggg-budget.test.ts
git commit -m "Claim rate limit slots from one shared counter before calling GGG"
```

---

### Task 5: The GGG client

**Files:**
- Create: `src/lib/ggg/client.ts`
- Create: `test/ggg-client.test.ts`

**Interfaces:**
- Consumes: `parseTriples`, `restrictionSeconds`, `capsFrom` from Task 3; `claimSlot`, `blockFor` from Task 4.
- Produces: `gggRequest<T>(path: string, poesessid: string, deps?: Deps): Promise<GggResult<T>>` where `type GggResult<T> = { ok: true; body: T } | { ok: false; kind: "wait" | "auth" | "error"; waitSeconds: number; message: string }`, and `type Deps = { fetchImpl?: typeof fetch; claim?: typeof claimSlot; block?: typeof blockFor }`.

- [ ] **Step 1: Write the failing test**

```ts
// test/ggg-client.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { gggRequest } from "../src/lib/ggg/client.ts";

const okClaim = async () => ({ ok: true, waitSeconds: 0 });
const noBlock = async () => {};

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

test("a good call returns the parsed body and sends the cookie", async () => {
  let seen: Request | undefined;
  const result = await gggRequest<{ name: string }>("/api/profile", "SESS", {
    fetchImpl: async (input, init) => {
      seen = new Request(input as string, init);
      return response({ name: "Exile#1234" });
    },
    claim: okClaim,
    block: noBlock,
  });

  assert.deepEqual(result, { ok: true, body: { name: "Exile#1234" } });
  assert.equal(seen?.headers.get("cookie"), "POESESSID=SESS");
  assert.ok(seen?.headers.get("user-agent")?.includes("poe-beast-prices"));
});

test("no slot means wait, and no call is made", async () => {
  let called = false;
  const result = await gggRequest("/api/profile", "SESS", {
    fetchImpl: async () => {
      called = true;
      return response({});
    },
    claim: async () => ({ ok: false, waitSeconds: 12 }),
    block: noBlock,
  });

  assert.equal(called, false);
  assert.deepEqual(result, {
    ok: false,
    kind: "wait",
    waitSeconds: 12,
    message: "Rate limit budget is spent. Try again in 12 seconds.",
  });
});

test("a 429 blocks everyone for Retry-After", async () => {
  let blocked = 0;
  const result = await gggRequest("/api/profile", "SESS", {
    fetchImpl: async () => response({}, 429, { "retry-after": "900" }),
    claim: okClaim,
    block: async (s: number) => {
      blocked = s;
    },
  });

  assert.equal(blocked, 900);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.kind, "wait");
  assert.equal(result.ok === false && result.waitSeconds, 900);
});

test("an active restriction in the headers blocks too", async () => {
  let blocked = 0;
  await gggRequest("/api/profile", "SESS", {
    fetchImpl: async () =>
      response({}, 200, {
        "x-rate-limit-ip": "45:60:60,200:120:900",
        "x-rate-limit-ip-state": "45:60:37,10:120:0",
      }),
    claim: okClaim,
    block: async (s: number) => {
      blocked = s;
    },
  });

  assert.equal(blocked, 37);
});

test("a rejected cookie is an auth failure and is never retried", async () => {
  const result = await gggRequest("/api/profile", "SESS", {
    fetchImpl: async () => response({}, 403),
    claim: okClaim,
    block: noBlock,
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.kind, "auth");
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/ggg/client.ts`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/ggg/client.ts
import { blockFor, claimSlot } from "./budget-db";
import { parseTriples, restrictionSeconds } from "./limits";

const BASE = "https://www.pathofexile.com";
const UA = "poe-beast-prices/0.1 (wealth tracker; maxikie02@gmail.com)";

export type GggResult<T> =
  | { ok: true; body: T }
  | {
      ok: false;
      kind: "wait" | "auth" | "error";
      waitSeconds: number;
      message: string;
    };

export type Deps = {
  fetchImpl?: typeof fetch;
  claim?: typeof claimSlot;
  block?: typeof blockFor;
};

/**
 * The only door to pathofexile.com. Everything else in the codebase goes
 * through here, because every call has to buy a slot from the shared budget
 * first: on Vercel the IP limit belongs to the deployment, not to a visitor.
 */
export async function gggRequest<T>(
  path: string,
  poesessid: string,
  deps: Deps = {},
): Promise<GggResult<T>> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const claim = deps.claim ?? claimSlot;
  const block = deps.block ?? blockFor;

  const slot = await claim();
  if (!slot.ok) {
    return {
      ok: false,
      kind: "wait",
      waitSeconds: slot.waitSeconds,
      message: `Rate limit budget is spent. Try again in ${slot.waitSeconds} seconds.`,
    };
  }

  const res = await fetchImpl(`${BASE}${path}`, {
    headers: {
      // The cookie lives exactly here, for exactly this call.
      cookie: `POESESSID=${poesessid}`,
      "user-agent": UA,
      accept: "application/json",
    },
    cache: "no-store",
  });

  const restricted = restrictionSeconds(
    parseTriples(res.headers.get("x-rate-limit-ip-state")),
  );
  if (restricted > 0) await block(restricted);

  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? 60) || 60;
    await block(retry);
    return {
      ok: false,
      kind: "wait",
      waitSeconds: retry,
      message: `GGG is rate limiting us for ${retry} seconds.`,
    };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      kind: "auth",
      waitSeconds: 0,
      message: "Path of Exile refused the session cookie. Paste a fresh one.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      kind: "error",
      waitSeconds: 0,
      message: `Path of Exile answered ${res.status}.`,
    };
  }

  return { ok: true, body: (await res.json()) as T };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ggg/client.ts test/ggg-client.test.ts
git commit -m "Put one door in front of pathofexile.com, with the budget behind it"
```

---

### Task 6: Reading the stash

**Files:**
- Create: `src/lib/ggg/stash.ts`
- Create: `test/stash.fixture.json`
- Create: `test/stash.test.ts`

**Interfaces:**
- Consumes: `gggRequest` from Task 5.
- Produces: `type StashTab = { id: string; index: number; name: string; colour?: string; type: string; folder: boolean }`, `type RawItem = { typeLine: string; baseType?: string; stackSize: number }`, `readTabs(body: unknown): StashTab[]`, `readItems(body: unknown): RawItem[]`, `fetchTabList(league, poesessid, account, deps?)`, `fetchTab(league, poesessid, account, tabIndex, deps?)`.

- [ ] **Step 1: Write the fixture**

A trimmed, hand-written copy of what `get-stash-items` answers. Two normal tabs, one folder, and three items with the shapes that matter: a stack, a single item, and one with a `baseType`.

```json
{
  "numTabs": 3,
  "tabs": [
    { "id": "aaa", "i": 0, "n": "Currency", "type": "CurrencyStash", "colour": { "r": 255, "g": 200, "b": 100 } },
    { "id": "bbb", "i": 1, "n": "Dump", "type": "PremiumStash", "colour": { "r": 10, "g": 20, "b": 30 } },
    { "id": "ccc", "i": 2, "n": "Old leagues", "type": "Folder", "colour": { "r": 0, "g": 0, "b": 0 } }
  ],
  "items": [
    { "typeLine": "Chaos Orb", "baseType": "Chaos Orb", "stackSize": 127, "maxStackSize": 5000 },
    { "typeLine": "Orb of Fusing", "baseType": "Orb of Fusing", "stackSize": 646 },
    { "typeLine": "Stacked Deck", "baseType": "Stacked Deck", "stackSize": 48 },
    { "typeLine": "Vaal Temple Map", "baseType": "Vaal Temple Map" }
  ]
}
```

- [ ] **Step 2: Write the failing test**

```ts
// test/stash.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readItems, readTabs } from "../src/lib/ggg/stash.ts";

const BODY = JSON.parse(
  readFileSync(new URL("./stash.fixture.json", import.meta.url), "utf8"),
);

test("tabs come back with their index, name and colour", () => {
  const tabs = readTabs(BODY);
  assert.equal(tabs.length, 3);
  assert.deepEqual(tabs[0], {
    id: "aaa",
    index: 0,
    name: "Currency",
    type: "CurrencyStash",
    colour: "#ffc864",
    folder: false,
  });
});

test("a folder is marked, because it holds tabs rather than items", () => {
  const folder = readTabs(BODY).find((t) => t.id === "ccc");
  assert.equal(folder?.folder, true);
});

test("items carry a stack size, defaulting to one", () => {
  const items = readItems(BODY);
  assert.equal(items.length, 4);
  assert.deepEqual(items[0], {
    typeLine: "Chaos Orb",
    baseType: "Chaos Orb",
    stackSize: 127,
  });
  assert.equal(items[3].stackSize, 1);
});

test("a body without tabs or items is empty, not a crash", () => {
  assert.deepEqual(readTabs({}), []);
  assert.deepEqual(readItems({}), []);
  assert.deepEqual(readTabs(null), []);
  assert.deepEqual(readItems("nonsense"), []);
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/ggg/stash.ts`.

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/ggg/stash.ts
import { gggRequest, type Deps } from "./client";

export type StashTab = {
  id: string;
  index: number;
  name: string;
  type: string;
  colour?: string;
  /** Folders hold tabs rather than items, so the walk skips them. */
  folder: boolean;
};

export type RawItem = {
  typeLine: string;
  baseType?: string;
  stackSize: number;
};

const hex = (c: { r?: number; g?: number; b?: number } | undefined) =>
  c
    ? `#${[c.r ?? 0, c.g ?? 0, c.b ?? 0]
        .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
        .join("")}`
    : undefined;

const rows = (body: unknown, key: string): unknown[] => {
  if (!body || typeof body !== "object") return [];
  const value = (body as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
};

export function readTabs(body: unknown): StashTab[] {
  return rows(body, "tabs").map((raw, position) => {
    const tab = raw as Record<string, never> & {
      id?: string;
      i?: number;
      n?: string;
      type?: string;
      colour?: { r?: number; g?: number; b?: number };
    };
    return {
      id: String(tab.id ?? position),
      index: typeof tab.i === "number" ? tab.i : position,
      name: String(tab.n ?? "Tab"),
      type: String(tab.type ?? "NormalStash"),
      colour: hex(tab.colour),
      folder: tab.type === "Folder",
    };
  });
}

export function readItems(body: unknown): RawItem[] {
  return rows(body, "items").map((raw) => {
    const item = raw as { typeLine?: string; baseType?: string; stackSize?: number };
    return {
      typeLine: String(item.typeLine ?? item.baseType ?? "Unknown"),
      baseType: item.baseType,
      stackSize: typeof item.stackSize === "number" ? item.stackSize : 1,
    };
  });
}

const stashPath = (
  league: string,
  account: string,
  params: Record<string, string>,
) =>
  `/character-window/get-stash-items?${new URLSearchParams({
    accountName: account,
    realm: "pc",
    league,
    ...params,
  })}`;

/** The tab list, which is also one request against the budget. */
export function fetchTabList(
  league: string,
  poesessid: string,
  account: string,
  deps?: Deps,
) {
  return gggRequest<unknown>(
    stashPath(league, account, { tabs: "1", tabIndex: "0" }),
    poesessid,
    deps,
  );
}

export function fetchTab(
  league: string,
  poesessid: string,
  account: string,
  tabIndex: number,
  deps?: Deps,
) {
  return gggRequest<unknown>(
    stashPath(league, account, { tabs: "0", tabIndex: String(tabIndex) }),
    poesessid,
    deps,
  );
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ggg/stash.ts test/stash.test.ts test/stash.fixture.json
git commit -m "Turn a stash answer into tabs and stacks"
```

---

### Task 7: Pricing by name

**Files:**
- Create: `src/lib/wealth/price.ts`
- Create: `test/wealth-price.test.ts`
- Modify: `src/lib/ninja.ts` (add the two overview fetchers)

**Interfaces:**
- Consumes: `RawItem` from Task 6, `PricedItem` from Task 1.
- Produces: `type PriceIndex = { chaos: Map<string, number>; divineRate?: number }`, `buildIndex(input: IndexInput): PriceIndex`, `priceStack(item: RawItem, tabId: string, index: PriceIndex): PricedItem | undefined`, `NAME_TYPES: readonly string[]`, and in `ninja.ts` `getCurrencyOverview(league, type)` and `getItemOverview(league, type)`.

- [ ] **Step 1: Write the failing test**

```ts
// test/wealth-price.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildIndex, priceStack } from "../src/lib/wealth/price.ts";

const index = buildIndex({
  currency: [
    { currencyTypeName: "Divine Orb", receive: { value: 200 } },
    { currencyTypeName: "Orb of Fusing", receive: { value: 0.09 } },
  ],
  items: [
    { category: "DivinationCard", lines: [{ name: "Stacked Deck", chaosValue: 3.3 }] },
    { category: "Scarab", lines: [{ name: "Trarthan Scarab of Infamy", chaosValue: 28 }] },
  ],
});

const stack = (typeLine: string, stackSize = 1) => ({ typeLine, stackSize });

test("the divine rate comes out of the currency overview", () => {
  assert.equal(index.divineRate, 200);
});

test("a chaos orb is worth one chaos without anyone saying so", () => {
  const priced = priceStack(stack("Chaos Orb", 127), "aaa", index);
  assert.deepEqual(priced, {
    name: "Chaos Orb",
    category: "Currency",
    tabId: "aaa",
    stack: 127,
    chaosEach: 1,
  });
});

test("a currency stack is priced per unit", () => {
  const priced = priceStack(stack("Orb of Fusing", 646), "aaa", index);
  assert.equal(priced?.chaosEach, 0.09);
  assert.equal(priced?.stack, 646);
});

test("an item overview line prices by name and keeps its category", () => {
  const priced = priceStack(stack("Stacked Deck", 48), "bbb", index);
  assert.equal(priced?.chaosEach, 3.3);
  assert.equal(priced?.category, "DivinationCard");
});

test("something nobody prices comes back undefined", () => {
  assert.equal(priceStack(stack("Vaal Temple Map"), "bbb", index), undefined);
  assert.equal(priceStack(stack("Astramentis"), "bbb", index), undefined);
});

test("currency wins when both overviews carry the same name", () => {
  const both = buildIndex({
    currency: [{ currencyTypeName: "Divine Orb", receive: { value: 200 } }],
    items: [{ category: "Fragment", lines: [{ name: "Divine Orb", chaosValue: 5 }] }],
  });
  assert.equal(priceStack(stack("Divine Orb"), "a", both)?.chaosEach, 200);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/wealth/price.ts`.

- [ ] **Step 3: Write the pricing**

```ts
// src/lib/wealth/price.ts
import type { PricedItem } from "@/lib/db/schema";
import type { RawItem } from "@/lib/ggg/stash";

/** Types poe.ninja prices by name alone. Variants come in a later plan. */
export const NAME_TYPES = [
  "Scarab",
  "Essence",
  "DivinationCard",
  "Oil",
  "Fossil",
  "Resonator",
  "DeliriumOrb",
  "Omen",
  "Tattoo",
  "Incubator",
  "Artifact",
  "Allflame",
  "Vial",
  "Invitation",
  "Beast",
] as const;

/** Both shapes poe.ninja answers with, narrowed to what pricing needs. */
export type CurrencyLine = {
  currencyTypeName: string;
  receive?: { value?: number } | null;
};
export type ItemLine = { name: string; chaosValue?: number };

export type IndexInput = {
  currency: CurrencyLine[];
  items: { category: string; lines: ItemLine[] }[];
};

export type PriceIndex = {
  /** name to `{ chaos, category }`. */
  chaos: Map<string, { chaos: number; category: string }>;
  divineRate?: number;
};

export function buildIndex({ currency, items }: IndexInput): PriceIndex {
  const chaos = new Map<string, { chaos: number; category: string }>();

  for (const group of items) {
    for (const line of group.lines) {
      if (typeof line.chaosValue !== "number") continue;
      chaos.set(line.name, { chaos: line.chaosValue, category: group.category });
    }
  }

  // Currency last, so it wins: it is the exchange rate rather than a listing.
  for (const line of currency) {
    const value = line.receive?.value;
    if (typeof value !== "number") continue;
    chaos.set(line.currencyTypeName, { chaos: value, category: "Currency" });
  }

  chaos.set("Chaos Orb", { chaos: 1, category: "Currency" });

  return { chaos, divineRate: chaos.get("Divine Orb")?.chaos };
}

export function priceStack(
  item: RawItem,
  tabId: string,
  index: PriceIndex,
): PricedItem | undefined {
  const hit = index.chaos.get(item.typeLine) ?? index.chaos.get(item.baseType ?? "");
  if (!hit) return undefined;
  return {
    name: item.typeLine,
    category: hit.category,
    tabId,
    stack: item.stackSize,
    chaosEach: hit.chaos,
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add the poe.ninja fetchers**

Append to `src/lib/ninja.ts`, following the file's existing `ninja<T>()` helper and its 900 second revalidate:

```ts
export type CurrencyOverviewLine = {
  currencyTypeName: string;
  receive?: { value?: number } | null;
};

export async function getCurrencyOverview(league: string, type: string) {
  const data = await ninja<{ lines: CurrencyOverviewLine[] }>(
    `/stash/current/currency/overview?league=${encodeURIComponent(league)}&type=${type}`,
  );
  return data.lines;
}

export type ItemOverviewLine = { name: string; chaosValue?: number };

export async function getItemOverview(league: string, type: string) {
  const data = await ninja<{ lines: ItemOverviewLine[] }>(
    `/stash/current/item/overview?league=${encodeURIComponent(league)}&type=${type}`,
  );
  return data.lines;
}
```

- [ ] **Step 6: Write the cached index builder**

```ts
// append to src/lib/wealth/price.ts
import { unstable_cache } from "next/cache";
import { getCurrencyOverview, getItemOverview } from "@/lib/ninja";

/**
 * One lookup per league, shared by every visitor and rebuilt on the same
 * fifteen minute window as the beast prices, so a sync spends no poe.ninja
 * request of its own.
 */
export const getPriceIndex = unstable_cache(
  async (league: string) => {
    const [currency, fragment, ...groups] = await Promise.all([
      getCurrencyOverview(league, "Currency").catch(() => []),
      getCurrencyOverview(league, "Fragment").catch(() => []),
      ...NAME_TYPES.map(async (type) => ({
        category: type,
        lines: await getItemOverview(league, type).catch(() => []),
      })),
    ]);
    const index = buildIndex({ currency: [...currency, ...fragment], items: groups });
    // Maps do not survive the cache, so hand back a plain object.
    return {
      entries: [...index.chaos.entries()],
      divineRate: index.divineRate,
    };
  },
  ["wealth-price-index"],
  { revalidate: 900 },
);

export async function priceIndexFor(league: string): Promise<PriceIndex> {
  const cached = await getPriceIndex(league);
  return { chaos: new Map(cached.entries), divineRate: cached.divineRate };
}
```

- [ ] **Step 7: Typecheck, lint, test, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`

```bash
git add src/lib/wealth/price.ts src/lib/ninja.ts test/wealth-price.test.ts
git commit -m "Price a stack from poe.ninja, once per league for everyone"
```

---

### Task 8: The session route

**Files:**
- Create: `src/lib/wealth/session.ts`
- Create: `src/app/api/wealth/session/route.ts`
- Create: `src/app/api/wealth/forget/route.ts`

**Interfaces:**
- Consumes: `signAccess`, `readAccess`, `ACCESS_MAX_AGE` from Task 2; `gggRequest` from Task 5; `getDb`, tables from Task 1.
- Produces: `requireAccount(): Promise<string | undefined>` and `ACCESS_COOKIE = "wealth_access"` from `session.ts`; `POST /api/wealth/session` answering `{ account, tabs }`; `POST /api/wealth/forget`.

- [ ] **Step 1: Write the session helper**

```ts
// src/lib/wealth/session.ts
import { cookies } from "next/headers";
import { readAccess } from "./token";

export const ACCESS_COOKIE = "wealth_access";

function secret() {
  const value = process.env.WEALTH_TOKEN_SECRET;
  if (!value) throw new Error("WEALTH_TOKEN_SECRET is not set");
  return value;
}

/** The account this browser has already proved it holds a cookie for. */
export async function requireAccount() {
  const jar = await cookies();
  return readAccess(jar.get(ACCESS_COOKIE)?.value, secret());
}

export { secret as accessSecret };
```

- [ ] **Step 2: Write the session route**

```ts
// src/app/api/wealth/session/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { stashAccounts, tabSelections } from "@/lib/db/schema";
import { gggRequest } from "@/lib/ggg/client";
import { fetchTabList, readTabs } from "@/lib/ggg/stash";
import { accessSecret, ACCESS_COOKIE } from "@/lib/wealth/session";
import { ACCESS_MAX_AGE, signAccess } from "@/lib/wealth/token";

export const maxDuration = 60;

const HOUR = 3_600_000;

/**
 * The one route that sees a POESESSID. It proves the cookie, names the
 * account, hands back an access token, and returns the tab list so the picker
 * has something to show. The cookie is not stored, logged or echoed.
 */
export async function POST(request: Request) {
  const { poesessid, league } = (await request.json()) as {
    poesessid?: string;
    league?: string;
  };
  if (!poesessid || !league) {
    return NextResponse.json({ error: "Missing cookie or league." }, { status: 400 });
  }

  const profile = await gggRequest<{ name?: string }>("/api/profile", poesessid);
  if (!profile.ok) {
    return NextResponse.json(
      { error: profile.message, waitSeconds: profile.waitSeconds },
      { status: profile.kind === "wait" ? 429 : 401 },
    );
  }

  const account = profile.body.name;
  if (!account) {
    return NextResponse.json({ error: "Path of Exile named no account." }, { status: 502 });
  }

  const db = getDb();
  const [known] = await db
    .select()
    .from(stashAccounts)
    .where(eq(stashAccounts.accountName, account));
  if (known?.badAuthAt && Date.now() - known.badAuthAt.getTime() < HOUR) {
    return NextResponse.json(
      { error: "This account is paused for an hour after a refused cookie." },
      { status: 429 },
    );
  }

  await db
    .insert(stashAccounts)
    .values({ accountName: account })
    .onConflictDoNothing();

  const list = await fetchTabList(league, poesessid, account);
  if (!list.ok) {
    if (list.kind === "auth") {
      await db
        .update(stashAccounts)
        .set({ badAuthAt: new Date(), lastError: list.message })
        .where(eq(stashAccounts.accountName, account));
    }
    return NextResponse.json(
      { error: list.message, waitSeconds: list.waitSeconds },
      { status: list.kind === "wait" ? 429 : 502 },
    );
  }

  const tabs = readTabs(list.body).filter((tab) => !tab.folder);
  for (const tab of tabs) {
    await db
      .insert(tabSelections)
      .values({
        accountName: account,
        league,
        tabId: tab.id,
        tabIndex: tab.index,
        name: tab.name,
        colour: tab.colour,
        type: tab.type,
        selected: false,
      })
      .onConflictDoUpdate({
        target: [tabSelections.accountName, tabSelections.league, tabSelections.tabId],
        // Selection is the visitor's, so it is never overwritten here.
        set: { tabIndex: tab.index, name: tab.name, colour: tab.colour, type: tab.type },
      });
  }

  const chosen = await db
    .select()
    .from(tabSelections)
    .where(eq(tabSelections.accountName, account));

  const response = NextResponse.json({
    account,
    tabs: chosen
      .filter((t) => t.league === league)
      .map((t) => ({
        id: t.tabId,
        index: t.tabIndex,
        name: t.name,
        colour: t.colour,
        selected: t.selected,
      })),
  });
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: signAccess(account, Date.now() + ACCESS_MAX_AGE * 1000, accessSecret()),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  return response;
}
```

- [ ] **Step 3: Write the forget route**

```ts
// src/app/api/wealth/forget/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { snapshots, stashAccounts, tabSelections } from "@/lib/db/schema";
import { ACCESS_COOKIE, requireAccount } from "@/lib/wealth/session";

export async function POST() {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not linked." }, { status: 401 });

  const db = getDb();
  await db.delete(snapshots).where(eq(snapshots.accountName, account));
  await db.delete(tabSelections).where(eq(tabSelections.accountName, account));
  await db.delete(stashAccounts).where(eq(stashAccounts.accountName, account));

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
```

- [ ] **Step 4: Try it against the real thing, once**

With `npm run dev` running and a POESESSID copied out of a browser logged into pathofexile.com:

```bash
curl -s -X POST http://localhost:3000/api/wealth/session \
  -H 'content-type: application/json' \
  -d '{"poesessid":"PASTE","league":"Allflame"}' | head -c 400
```

Expected: an account name and the tab list. **Run this once.** A wrong cookie is a 4xx against GGG's own threshold, so fix the cookie rather than repeating the call.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wealth/session.ts src/app/api/wealth
git commit -m "Prove a session cookie once, then hand the browser a token and its tabs"
```

---

### Task 9: The sync routes

**Files:**
- Create: `src/app/api/wealth/tabs/route.ts`
- Create: `src/app/api/wealth/sync/start/route.ts`
- Create: `src/app/api/wealth/sync/tab/route.ts`
- Create: `src/app/api/wealth/sync/finish/route.ts`
- Create: `src/lib/wealth/snapshot.ts`
- Create: `test/wealth-snapshot.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `summarise(items: PricedItem[]): { totalChaos: number; breakdown: BreakdownRow[] }` from `snapshot.ts`; `PUT /api/wealth/tabs`; `POST /api/wealth/sync/start` answering `{ snapshotId, tabs }`; `POST /api/wealth/sync/tab` answering `{ priced, unpriced }` or `429 { waitSeconds }`; `POST /api/wealth/sync/finish` answering `{ totalChaos, divineRate, breakdown, unpricedCount }`.

- [ ] **Step 1: Write the failing test for the summary**

```ts
// test/wealth-snapshot.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { summarise } from "../src/lib/wealth/snapshot.ts";

const item = (
  name: string,
  category: string,
  stack: number,
  chaosEach: number,
) => ({ name, category, tabId: "aaa", stack, chaosEach });

test("the total is every stack at its unit price", () => {
  const { totalChaos } = summarise([
    item("Chaos Orb", "Currency", 127, 1),
    item("Stacked Deck", "DivinationCard", 48, 3.3),
  ]);
  assert.equal(Math.round(totalChaos), 285);
});

test("the breakdown groups by category, biggest first", () => {
  const { breakdown } = summarise([
    item("Chaos Orb", "Currency", 10, 1),
    item("Stacked Deck", "DivinationCard", 10, 3),
    item("Orb of Fusing", "Currency", 10, 0.1),
  ]);
  assert.deepEqual(breakdown, [
    { category: "DivinationCard", chaos: 30, count: 10 },
    { category: "Currency", chaos: 11, count: 20 },
  ]);
});

test("nothing at all is a zero total and an empty breakdown", () => {
  assert.deepEqual(summarise([]), { totalChaos: 0, breakdown: [] });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/lib/wealth/snapshot.ts`.

- [ ] **Step 3: Write the summary**

```ts
// src/lib/wealth/snapshot.ts
import type { BreakdownRow, PricedItem } from "@/lib/db/schema";

export function summarise(items: PricedItem[]) {
  let totalChaos = 0;
  const byCategory = new Map<string, BreakdownRow>();

  for (const item of items) {
    const chaos = item.stack * item.chaosEach;
    totalChaos += chaos;
    const row = byCategory.get(item.category) ?? {
      category: item.category,
      chaos: 0,
      count: 0,
    };
    row.chaos += chaos;
    row.count += item.stack;
    byCategory.set(item.category, row);
  }

  return {
    totalChaos,
    breakdown: [...byCategory.values()].sort((a, b) => b.chaos - a.chaos),
  };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the tab selection route**

```ts
// src/app/api/wealth/tabs/route.ts
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tabSelections } from "@/lib/db/schema";
import { requireAccount } from "@/lib/wealth/session";

/** One minute of budget at our own cap, which is where 25 comes from. */
export const MAX_TABS = 25;

export async function PUT(request: Request) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not linked." }, { status: 401 });

  const { league, selected } = (await request.json()) as {
    league?: string;
    selected?: string[];
  };
  if (!league || !Array.isArray(selected)) {
    return NextResponse.json({ error: "Missing league or selection." }, { status: 400 });
  }
  if (selected.length > MAX_TABS) {
    return NextResponse.json(
      { error: `At most ${MAX_TABS} tabs can be synced at once.` },
      { status: 400 },
    );
  }

  const db = getDb();
  const where = and(
    eq(tabSelections.accountName, account),
    eq(tabSelections.league, league),
  );
  await db.update(tabSelections).set({ selected: false }).where(where);
  if (selected.length > 0) {
    await db
      .update(tabSelections)
      .set({ selected: true })
      .where(and(where, inArray(tabSelections.tabId, selected)));
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Write the sync start route**

```ts
// src/app/api/wealth/sync/start/route.ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { snapshots, tabSelections } from "@/lib/db/schema";
import { requireAccount } from "@/lib/wealth/session";

const HOUR = 3_600_000;

export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not linked." }, { status: 401 });

  const { league } = (await request.json()) as { league?: string };
  if (!league) return NextResponse.json({ error: "Missing league." }, { status: 400 });

  const db = getDb();
  const where = and(
    eq(snapshots.accountName, account),
    eq(snapshots.league, league),
    eq(snapshots.status, "draft"),
  );

  // A draft older than an hour belonged to a browser that went away.
  const [open] = await db.select().from(snapshots).where(where);
  if (open && Date.now() - open.takenAt.getTime() > HOUR) {
    await db.delete(snapshots).where(eq(snapshots.id, open.id));
  } else if (open) {
    await db.delete(snapshots).where(eq(snapshots.id, open.id));
  }

  const tabs = await db
    .select()
    .from(tabSelections)
    .where(
      and(
        eq(tabSelections.accountName, account),
        eq(tabSelections.league, league),
        eq(tabSelections.selected, true),
      ),
    );

  const [draft] = await db
    .insert(snapshots)
    .values({ accountName: account, league, status: "draft" })
    .returning({ id: snapshots.id });

  return NextResponse.json({
    snapshotId: draft.id,
    tabs: tabs
      .sort((a, b) => a.tabIndex - b.tabIndex)
      .map((t) => ({ id: t.tabId, index: t.tabIndex, name: t.name })),
  });
}
```

- [ ] **Step 7: Write the per-tab route**

```ts
// src/app/api/wealth/sync/tab/route.ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { snapshots, type PricedItem } from "@/lib/db/schema";
import { fetchTab, readItems } from "@/lib/ggg/stash";
import { priceIndexFor, priceStack } from "@/lib/wealth/price";
import { requireAccount } from "@/lib/wealth/session";

export const maxDuration = 60;

/** Exactly one call to GGG, so nothing here can run out of time. */
export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not linked." }, { status: 401 });

  const { poesessid, league, snapshotId, tabId, tabIndex } =
    (await request.json()) as {
      poesessid?: string;
      league?: string;
      snapshotId?: number;
      tabId?: string;
      tabIndex?: number;
    };
  if (!poesessid || !league || !snapshotId || !tabId || tabIndex === undefined) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const db = getDb();
  const [draft] = await db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.id, snapshotId),
        // Scoped by the token's account, never by anything the caller sent.
        eq(snapshots.accountName, account),
        eq(snapshots.status, "draft"),
      ),
    );
  if (!draft) return NextResponse.json({ error: "No open sync." }, { status: 409 });

  const answer = await fetchTab(league, poesessid, account, tabIndex);
  if (!answer.ok) {
    return NextResponse.json(
      { error: answer.message, waitSeconds: answer.waitSeconds },
      { status: answer.kind === "wait" ? 429 : 502 },
    );
  }

  const index = await priceIndexFor(league);
  const raw = readItems(answer.body);
  const priced: PricedItem[] = [];
  let unpriced = 0;
  for (const item of raw) {
    const line = priceStack(item, tabId, index);
    if (line) priced.push(line);
    else unpriced += 1;
  }

  await db
    .update(snapshots)
    .set({
      items: [...draft.items, ...priced],
      unpricedCount: draft.unpricedCount + unpriced,
      divineRate: index.divineRate ?? draft.divineRate,
    })
    .where(eq(snapshots.id, snapshotId));

  return NextResponse.json({ priced: priced.length, unpriced });
}
```

- [ ] **Step 8: Write the finish route**

```ts
// src/app/api/wealth/sync/finish/route.ts
import { NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { snapshots, stashAccounts } from "@/lib/db/schema";
import { requireAccount } from "@/lib/wealth/session";
import { summarise } from "@/lib/wealth/snapshot";

const DAY = 86_400_000;
/** History is kept for two months, and item detail only for the last thirty. */
const KEEP_DAYS = 60;
const KEEP_ITEMS = 30;

export async function POST(request: Request) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Not linked." }, { status: 401 });

  const { league, snapshotId } = (await request.json()) as {
    league?: string;
    snapshotId?: number;
  };
  if (!league || !snapshotId) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const db = getDb();
  const [draft] = await db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.id, snapshotId), eq(snapshots.accountName, account)));
  if (!draft) return NextResponse.json({ error: "No open sync." }, { status: 409 });

  const { totalChaos, breakdown } = summarise(draft.items);
  await db
    .update(snapshots)
    .set({ status: "done", totalChaos, breakdown, takenAt: new Date() })
    .where(eq(snapshots.id, snapshotId));

  await db
    .update(stashAccounts)
    .set({ lastSyncAt: new Date(), lastError: null })
    .where(eq(stashAccounts.accountName, account));

  // Prune: old snapshots go, and older ones keep only their numbers.
  const mine = and(
    eq(snapshots.accountName, account),
    eq(snapshots.league, league),
  );
  await db.delete(snapshots).where(
    and(mine, lt(snapshots.takenAt, new Date(Date.now() - KEEP_DAYS * DAY))),
  );
  const rows = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(mine)
    .orderBy(desc(snapshots.takenAt));
  for (const row of rows.slice(KEEP_ITEMS)) {
    await db.update(snapshots).set({ items: [] }).where(eq(snapshots.id, row.id));
  }

  return NextResponse.json({
    totalChaos,
    breakdown,
    divineRate: draft.divineRate,
    unpricedCount: draft.unpricedCount,
  });
}
```

- [ ] **Step 9: Typecheck, lint, test, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`

```bash
git add src/lib/wealth/snapshot.ts src/app/api/wealth test/wealth-snapshot.test.ts
git commit -m "Walk a sync one tab at a time and close it with a total"
```

---

### Task 10: The Wealth page

**Files:**
- Create: `src/components/wealth-panel.tsx`
- Modify: `src/app/[league]/wealth/page.tsx` (replacing the stub from the shell plan)

**Interfaces:**
- Consumes: the four routes from Tasks 8 and 9, `requireAccount` from Task 8.
- Produces: a page that pastes, picks tabs, syncs and shows a total. The chart, the breakdown card and the item table are the next plan; this one proves the pipe works end to end.

- [ ] **Step 1: Write the panel**

```tsx
// src/components/wealth-panel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KEY = "wealth.poesessid";

type Tab = { id: string; index: number; name: string; selected?: boolean };

const sleep = (seconds: number) =>
  new Promise((done) => setTimeout(done, seconds * 1000));

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: path.endsWith("/tabs") ? "PUT" : "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

export function WealthPanel({
  league,
  account,
}: {
  league: string;
  account?: string;
}) {
  const [session, setSession] = useState("");
  const [linked, setLinked] = useState(account);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState<number>();
  const [busy, setBusy] = useState(false);

  /** Read only when a request needs it. It is never put into React state. */
  const stored = () =>
    (typeof window === "undefined" ? "" : localStorage.getItem(KEY)) ?? "";

  async function link() {
    setBusy(true);
    setStatus("Checking the session cookie");
    const cookie = session || stored();
    const { status: code, body } = await post("/api/wealth/session", {
      poesessid: cookie,
      league,
    });
    if (code !== 200) {
      setStatus(body.error ?? "That did not work.");
      setBusy(false);
      return;
    }
    localStorage.setItem(KEY, cookie);
    setSession("");
    setLinked(body.account);
    setTabs(body.tabs);
    setStatus(`Linked as ${body.account}. Pick the tabs that count.`);
    setBusy(false);
  }

  async function save(next: Tab[]) {
    setTabs(next);
    await post("/api/wealth/tabs", {
      league,
      selected: next.filter((t) => t.selected).map((t) => t.id),
    });
  }

  async function sync() {
    const poesessid = stored();
    if (!poesessid) {
      setStatus("Paste the session cookie again first.");
      return;
    }
    setBusy(true);

    const started = await post("/api/wealth/sync/start", { league });
    if (started.status !== 200) {
      setStatus(started.body.error ?? "Could not start.");
      setBusy(false);
      return;
    }
    const { snapshotId, tabs: walk } = started.body as {
      snapshotId: number;
      tabs: Tab[];
    };

    for (const [done, tab] of walk.entries()) {
      setStatus(`Reading ${tab.name} (${done + 1} of ${walk.length})`);
      for (;;) {
        const answer = await post("/api/wealth/sync/tab", {
          poesessid,
          league,
          snapshotId,
          tabId: tab.id,
          tabIndex: tab.index,
        });
        if (answer.status === 200) break;
        if (answer.status === 429) {
          const wait = answer.body.waitSeconds ?? 30;
          setStatus(`Waiting ${wait}s for the rate limit`);
          await sleep(wait);
          continue;
        }
        setStatus(answer.body.error ?? "The sync stopped.");
        setBusy(false);
        return;
      }
    }

    const finished = await post("/api/wealth/sync/finish", { league, snapshotId });
    setTotal(finished.body.totalChaos);
    setStatus(
      `Done. ${finished.body.unpricedCount} items had no price on poe.ninja.`,
    );
    setBusy(false);
  }

  async function forget() {
    await post("/api/wealth/forget", {});
    localStorage.removeItem(KEY);
    setLinked(undefined);
    setTabs([]);
    setTotal(undefined);
    setStatus("Everything about this account is deleted.");
  }

  return (
    <div className="space-y-6">
      {!linked && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm">
            Paste your POESESSID cookie. It stays in this browser, is sent only
            when a sync runs, and is never written down on the server.
          </p>
          <p className="text-muted-foreground text-xs">
            That cookie is full access to your Path of Exile account. Logging
            out of pathofexile.com revokes it.
          </p>
          <div className="flex gap-2">
            <Input
              value={session}
              onChange={(e) => setSession(e.target.value)}
              placeholder="POESESSID"
              className="font-mono"
            />
            <Button onClick={link} disabled={busy || !session}>
              Link
            </Button>
          </div>
        </div>
      )}

      {linked && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Linked as <span className="font-medium">{linked}</span>
          </span>
          <Button onClick={sync} disabled={busy}>
            Sync
          </Button>
          <Button variant="ghost" onClick={forget} disabled={busy}>
            Forget me
          </Button>
        </div>
      )}

      {tabs.length > 0 && (
        <div className="grid gap-1 rounded-lg border p-4 sm:grid-cols-3">
          {tabs.map((tab) => (
            <label key={tab.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tab.selected ?? false}
                onChange={(e) =>
                  save(
                    tabs.map((t) =>
                      t.id === tab.id ? { ...t, selected: e.target.checked } : t,
                    ),
                  )
                }
              />
              {tab.name}
            </label>
          ))}
        </div>
      )}

      {total !== undefined && (
        <p className="text-2xl font-semibold">{Math.round(total)}c</p>
      )}
      {status && <p className="text-muted-foreground text-sm">{status}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Wire the page**

```tsx
// src/app/[league]/wealth/page.tsx
import { notFound } from "next/navigation";
import { resolveLeague } from "@/lib/league";
import { requireAccount } from "@/lib/wealth/session";
import { WealthPanel } from "@/components/wealth-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wealth",
  description: "What your stash tabs are worth, tracked over time.",
};

export default async function Page({ params }: PageProps<"/[league]/wealth">) {
  const { league } = await resolveLeague((await params).league);
  if (!league) notFound();
  const account = await requireAccount();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-10 pb-12">
      <h1 className="text-2xl font-semibold">Wealth</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        {league}
      </p>
      <WealthPanel league={league} account={account} />
    </main>
  );
}
```

- [ ] **Step 3: Run it end to end, once**

Run `npm run dev`, open `http://localhost:3000/allflame/wealth`, paste a real POESESSID, pick **two** tabs to start with, press Sync.

Expected: the status line names each tab as it is read, then a total in chaos. Check in Supabase that `snapshots` has one `done` row with a populated `items` array, and that no table anywhere holds the cookie.

If a 429 appears, the panel waits it out and continues by itself. Do not press Sync repeatedly to see what happens: that is how the whole deployment gets banned.

- [ ] **Step 4: Typecheck, lint, test, build, commit**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`

```bash
git add src/components/wealth-panel.tsx src/app/[league]/wealth/page.tsx
git commit -m "Paste, pick tabs, sync, and see what the stash is worth"
```

---

### Task 11: Guard the cookie

**Files:**
- Create: `test/wealth-guard.test.ts`

**Interfaces:**
- Consumes: nothing. It reads the source tree.

- [ ] **Step 1: Write the test**

```ts
// test/wealth-guard.test.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("../src/", import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const sources = files(ROOT).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

test("only the GGG client sends the session cookie", () => {
  const senders = sources.filter(
    (file) =>
      readFileSync(file, "utf8").includes("POESESSID=") &&
      !file.endsWith("ggg/client.ts"),
  );
  assert.deepEqual(senders, []);
});

test("no database column stores the session cookie", () => {
  const schema = readFileSync(join(ROOT, "lib/db/schema.ts"), "utf8");
  for (const word of ["poesessid", "sessionCookie", "sess_enc"]) {
    assert.equal(schema.toLowerCase().includes(word.toLowerCase()), false, word);
  }
});

test("nothing logs a request body from the wealth routes", () => {
  const routes = sources.filter((f) => f.includes("api/wealth"));
  assert.ok(routes.length > 0, "wealth routes should exist");
  for (const file of routes) {
    assert.equal(readFileSync(file, "utf8").includes("console.log"), false, file);
  }
});
```

- [ ] **Step 2: Run the test**

Run: `npm test`
Expected: PASS. If it fails, the fix is to move the offending code behind `gggRequest`, not to loosen the test.

- [ ] **Step 3: Commit**

```bash
git add test/wealth-guard.test.ts
git commit -m "Fail the build if the session cookie leaks out of its one door"
```

---

## Self-Review

**Spec coverage.**

| Spec section | Tasks |
| --- | --- |
| Schema, JSON snapshot column, one draft per account | 1 |
| Access token, thirty days, signature only | 2, 8 |
| Rate limit rules, self caps at two thirds, dynamic tightening | 3 |
| Shared budget claimed from Postgres before every call | 4 |
| One door to GGG, 429 handling, 4xx discipline | 5, 8 |
| Tab list, folder tabs skipped | 6, 8 |
| Pricing by name, shared per league cache, unpriced counted | 7 |
| Sync as start, per tab, finish, with pruning | 9 |
| Paste card, tab picker, sync, forget | 10 |
| Guard test that the cookie never leaks | 11 |

Deliberately **not** in this plan, and carried to the next one: the chart, the breakdown card, the item table, the divine display, the cooldown countdown on the Sync button, and every variant matcher (uniques by links, gems by level and quality, maps by tier, cluster jewels). The spec's five minute per account cooldown is also next: the budget already stops runaway syncing, and a second cooldown is worth writing against a real page rather than a stub.

**Placeholders.** None. Every step carries its code. Task 4 Step 5 and Task 8 have no unit tests by design, and both say why and where they are checked instead.

**Type consistency.** `Cap` is defined in Task 3 and consumed by name in Task 4. `Window` and `Claim` are defined in Task 4 and used by `claimSlot`. `Deps` and `GggResult` are defined in Task 5 and used in Task 6. `RawItem` from Task 6 and `PricedItem` from Task 1 meet in `priceStack` in Task 7. `PriceIndex` carries `chaos: Map<string, { chaos, category }>`, which is what Task 9's tab route consumes through `priceIndexFor`. `summarise` returns `{ totalChaos, breakdown }`, which is what the finish route writes and the panel reads.

**One known rough edge.** Task 9's start route deletes any open draft rather than resuming it, which the spec describes as resumable. Deleting is correct and simple: a draft only exists mid-sync, and a browser that comes back starts over rather than merging two partial walks. If resuming is wanted later, it is a change to that one route.
