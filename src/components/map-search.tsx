"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  COMMON_GROUP_IDS,
  MOD_GROUPS,
  PRESETS,
  displayLine,
  looseLines,
  matchesQuery,
} from "@/lib/map-mod-groups";
import { REWARD_STATS, planMapSearch } from "@/lib/map-regex";

/**
 * A modifier no curated group speaks for is its own ban of one line, so it
 * takes the same shape as a group and one list can hold both.
 */
const LOOSE = looseLines().map((line) => ({
  id: line,
  lines: [line] as readonly string[],
}));

const ALL = [...MOD_GROUPS, ...LOOSE];
const BY_ID = new Map(ALL.map((entry) => [entry.id, entry]));

/**
 * Where there is no room for every line: the first one, and a mark saying more
 * follow. Still the game's wording, only cut short.
 */
const shortTitle = (entry: { lines: readonly string[] }) =>
  displayLine(entry.lines[0]) + (entry.lines.length > 1 ? " …" : "");

const COMMON = MOD_GROUPS.filter((g) => COMMON_GROUP_IDS.includes(g.id));

/**
 * Every chip in the same column width, in both lists. A modifier is not more
 * important for being longer, and a ragged wrap reads as if it were.
 */
const CHIP_GRID = "grid grid-cols-2 gap-1.5 lg:grid-cols-3";

/**
 * Inside a preset the same rule holds, but the card is half the page wide, so
 * a third column would cut every line to three words and tell you nothing.
 */
const PRESET_CHIP_GRID = "grid grid-cols-2 gap-1.5";

export function MapSearch() {
  const [banned, setBanned] = useState<string[]>([
    "reflect",
    "no-regen",
    "no-leech",
  ]);
  /**
   * Quantity starts at 1, which asks only that the line is there at all. An
   * unrolled white map prints no quantity, so it starts out dark: it needs work
   * just as much as a badly rolled rare one, and lighting it would make "dark"
   * mean two different things depending on the map.
   */
  const [minimums, setMinimums] = useState<Record<string, string>>({
    quantity: "1",
  });

  /**
   * Kept as typed rather than as a number, so clearing a field leaves it empty
   * instead of snapping back to a zero you then have to delete again.
   */
  const asked = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(minimums).map(([id, text]) => [id, Number(text) || 0]),
      ),
    [minimums],
  );
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const plan = useMemo(() => {
    const chosen = new Set(banned);
    return planMapSearch(
      ALL.filter((g) => chosen.has(g.id)).flatMap((g) => [...g.lines]),
      { minimums: asked },
    );
  }, [banned, asked]);

  const toggle = (id: string) =>
    setBanned((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const copy = async () => {
    await navigator.clipboard.writeText(plan.search);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const searching = query.trim() !== "";

  /**
   * Browsing and searching want different corpora. Twenty-nine named groups are
   * a list you can read; a hundred and twenty-five is a wall. But a modifier
   * nobody named still has to be findable, so the moment there is a query the
   * search runs over everything.
   */
  const pool = searching || showAll ? ALL : COMMON;

  /**
   * While browsing, what you already banned lives in its own block and would
   * only be listed twice. While searching it has to stay, or a search for
   * wording that only a banned group carries answers "nothing matches" about a
   * modifier that is right there.
   */
  const shown = useMemo(
    () =>
      pool.filter(
        (entry) =>
          (searching || !banned.includes(entry.id)) &&
          matchesQuery(entry, query),
      ),
    [pool, banned, query, searching],
  );

  /**
   * Read off `banned` rather than filtered from the pool, so a loose line
   * banned through the search does not vanish when the query is cleared.
   */
  const chosen = banned
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is (typeof ALL)[number] => entry !== undefined);

  return (
    <div className="space-y-6">
      {/* The output is the reason the page exists, so it goes first. */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="bg-muted flex min-h-10 flex-1 items-center rounded-md px-3 py-2 font-mono text-sm break-all">
            {plan.search || "Pick something to ban."}
          </code>
          <Button onClick={copy} disabled={!plan.search} size="icon">
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
        {/* Magic maps cannot be told from rare ones, so this only reaches the
            unrolled white ones: they print no quantity line at all, and asking
            for one at 1% drops them. See docs/stash-search.md, Test 8. */}
        <label className="text-muted-foreground flex w-fit items-center gap-2 text-sm">
          <Checkbox
            checked={(Number(minimums.quantity) || 0) >= 1}
            onCheckedChange={(on) =>
              setMinimums((prev) => ({
                ...prev,
                quantity:
                  on === true ? String(Math.max(asked.quantity, 1)) : "",
              }))
            }
          />
          Leave white maps dark
        </label>

        {plan.unreachable.length > 0 && (
          <p className="text-destructive text-sm">
            No fragment can single these out without hiding maps you can run:{" "}
            {plan.unreachable.join(", ")}
          </p>
        )}
      </div>

      {/* The game adds these three up for you and prints the total on the map,
          so they are asked about directly rather than reasoned out of the
          affixes. Zero asks nothing; one asks only that the line is there,
          which is what keeps an unrolled map dark. */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Minimums</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {REWARD_STATS.map((stat) => (
            <label
              key={stat.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              {stat.label}
              <span className="flex items-center gap-1">
                <Input
                  inputMode="numeric"
                  value={minimums[stat.id] ?? ""}
                  onChange={(e) =>
                    setMinimums((prev) => ({
                      ...prev,
                      // Three digits of nothing but digits: everything the
                      // generator can express, and no state it cannot read.
                      [stat.id]: e.target.value.replace(/\D/g, "").slice(0, 3),
                    }))
                  }
                  className="h-7 w-14 text-right tabular-nums"
                />
                <span className="text-muted-foreground">%</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* A preset is a build's answer, so it says what it answers with. */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Presets</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((preset) => {
            const active = preset.groups.every((id) => banned.includes(id));

            return (
              <button
                key={preset.id}
                onClick={() =>
                  setBanned((prev) =>
                    active
                      ? prev.filter((id) => !preset.groups.includes(id))
                      : [...new Set([...prev, ...preset.groups])],
                  )
                }
                // A button centres its content, which leaves the shorter card
                // floating. Stacking from the top lines the two titles up.
                className={`group/preset hover:bg-muted/50 flex flex-col items-stretch rounded-md border p-3 text-left ${
                  active ? "border-primary bg-muted/30" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{preset.label}</span>
                  {active && <Check className="text-primary size-4 shrink-0" />}
                </div>
                {/* What a preset bans is the answer to a question you only ask
                    about one of them, so the list unrolls under the pointer
                    rather than turning both cards into a wall of text. A grid
                    row from 0fr to 1fr is the one way to animate to a height
                    nobody knows in advance. */}
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows,margin] duration-200 group-hover/preset:mt-1.5 group-hover/preset:grid-rows-[1fr]">
                  <div className={`overflow-hidden ${PRESET_CHIP_GRID}`}>
                    {preset.groups.map((id) => {
                      const entry = BY_ID.get(id);
                      const title = entry ? shortTitle(entry) : id;
                      return (
                        <span
                          key={id}
                          title={title}
                          className="bg-muted text-muted-foreground truncate rounded px-1.5 py-0.5 text-xs"
                        >
                          {title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* What you picked stays visible however deep the search goes. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Banned ({chosen.length})</h2>
          {chosen.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setBanned([])}>
              Clear
            </Button>
          )}
        </div>

        {chosen.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing banned yet, so every map shows.
          </p>
        ) : (
          // One column width for every modifier: the game's wording runs from
          // three words to fifteen, and ragged chips read as a ranking of
          // something. The title carries the line the chip had to cut.
          <div className={CHIP_GRID}>
            {chosen.map((entry) => (
              <button
                key={entry.id}
                onClick={() => toggle(entry.id)}
                title={`Remove: ${shortTitle(entry)}`}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/70 flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-sm"
              >
                <span className="truncate">{shortTitle(entry)}</span>
                <X className="size-3.5 shrink-0 opacity-60" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search all ${ALL.length} in the game's wording`}
            className="pl-9"
          />
        </div>

        {shown.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {searching
              ? `Nothing matches "${query.trim()}".`
              : "Everything here is banned already."}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {shown.map((group) => (
              <label
                key={group.id}
                className={`hover:bg-muted/50 flex items-start gap-3 rounded-md border p-3 text-sm ${
                  banned.includes(group.id) ? "border-primary bg-muted/30" : ""
                }`}
              >
                <Checkbox
                  checked={banned.includes(group.id)}
                  onCheckedChange={() => toggle(group.id)}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  {group.lines.map((line) => (
                    <span key={line} className="block">
                      {displayLine(line)}
                    </span>
                  ))}
                </span>
              </label>
            ))}
          </div>
        )}

        {!searching && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? `Show the ${COMMON.length} common ones only`
              : `Show all ${ALL.length}`}
          </Button>
        )}
      </div>
    </div>
  );
}
