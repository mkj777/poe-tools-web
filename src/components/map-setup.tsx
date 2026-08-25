"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/currency";
import type { PricedAstrolabe } from "@/lib/astrolabes";
import type { PricedScarab } from "@/lib/ninja";
import { num } from "@/lib/utils";

/**
 * What one map costs to set up, from what you actually put in the device.
 *
 * The prices come from two different places for a reason. Scarabs trade on the
 * currency exchange, so poe.ninja quotes all hundred-odd of them. Astrolabes
 * appear in none of its overviews, so theirs are the cheapest live listing on
 * the trade site, kept warm by the cron. See src/lib/astrolabes.ts.
 */

/** A setup survives a reload. Retyping five scarabs every visit is not a tool. */
const SAVED = "map-regex:setup";

type Setup = { counts: Record<string, number>; astrolabe: string | null };

const EMPTY: Setup = { counts: {}, astrolabe: null };

function load(): Setup {
  try {
    const raw = localStorage.getItem(SAVED);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Setup>;
    return { counts: parsed.counts ?? {}, astrolabe: parsed.astrolabe ?? null };
  } catch {
    return EMPTY;
  }
}

/**
 * The setup lives in a tiny store rather than in state, the way the beast
 * table's mode does. The server renders an empty one, the browser corrects it
 * on hydration, and neither has to read storage during a render.
 *
 * `read` has to hand back the same object every time until something changes,
 * or React re-renders forever, so it caches.
 */
const setupStore = {
  listeners: new Set<() => void>(),
  cached: null as Setup | null,
  read(): Setup {
    setupStore.cached ??= load();
    return setupStore.cached;
  },
  write(next: Setup) {
    setupStore.cached = next;
    try {
      localStorage.setItem(SAVED, JSON.stringify(next));
    } catch {
      // A browser refusing storage costs the saved setup and nothing else.
    }
    for (const listener of setupStore.listeners) listener();
  },
  subscribe(listener: () => void) {
    setupStore.listeners.add(listener);
    return () => {
      setupStore.listeners.delete(listener);
    };
  },
};

export function MapSetup({
  scarabs,
  astrolabes,
  divine,
}: {
  scarabs: PricedScarab[];
  astrolabes: PricedAstrolabe[];
  /** Chaos per Divine Orb, for the second line of the total. */
  divine?: number;
}) {
  const setup = useSyncExternalStore(
    setupStore.subscribe,
    setupStore.read,
    () => EMPTY,
  );
  const [query, setQuery] = useState("");

  const byId = useMemo(
    () => new Map(scarabs.map((scarab) => [scarab.id, scarab])),
    [scarabs],
  );

  const chosen = Object.entries(setup.counts)
    .flatMap(([id, count]) => {
      const scarab = byId.get(id);
      return scarab && count > 0 ? [{ scarab, count }] : [];
    })
    .sort((a, b) => a.scarab.name.localeCompare(b.scarab.name));

  const astrolabe = astrolabes.find((a) => a.name === setup.astrolabe);

  const total =
    chosen.reduce((sum, { scarab, count }) => sum + scarab.chaosValue * count, 0) +
    (astrolabe?.chaosValue ?? 0);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? scarabs
        .filter(
          (scarab) =>
            scarab.name.toLowerCase().includes(needle) &&
            !setup.counts[scarab.id],
        )
        .slice(0, 8)
    : [];

  const setCount = (id: string, count: number) => {
    const counts = { ...setup.counts };
    if (count > 0) counts[id] = count;
    else delete counts[id];
    setupStore.write({ ...setup, counts });
  };

  return (
    <div className="bg-card divide-y rounded-xl border">
      <div className="px-3 py-2">
        <div className="text-sm font-medium">Setup</div>
        <div className="text-muted-foreground text-sm">
          What one map costs
        </div>
      </div>

      {chosen.map(({ scarab, count }) => (
        <div key={scarab.id} className="flex items-center gap-2 px-3 py-2">
          <Image
            src={scarab.icon}
            alt=""
            width={22}
            height={22}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium" title={scarab.name}>
              {scarab.name}
            </div>
            <div className="text-muted-foreground text-sm">
              <Price value={scarab.chaosValue * count} size={14} />
            </div>
          </div>
          <Input
            inputMode="numeric"
            aria-label={`How many ${scarab.name}`}
            value={String(count)}
            onChange={(e) =>
              setCount(scarab.id, Number(e.target.value.replace(/\D/g, "")) || 0)
            }
            className="h-8 w-14 shrink-0 text-right tabular-nums"
          />
          <button
            onClick={() => setCount(scarab.id, 0)}
            title="Remove"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a scarab"
            className="h-8 pl-8"
          />
        </div>

        {matches.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {matches.map((scarab) => (
              <button
                key={scarab.id}
                onClick={() => {
                  setCount(scarab.id, 1);
                  setQuery("");
                }}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left"
              >
                <Image
                  src={scarab.icon}
                  alt=""
                  width={18}
                  height={18}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {scarab.name}
                </span>
                <Price value={scarab.chaosValue} size={13} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2">
        <label className="text-muted-foreground text-sm">Astrolabe</label>
        <select
          value={setup.astrolabe ?? ""}
          onChange={(e) =>
            setupStore.write({ ...setup, astrolabe: e.target.value || null })
          }
          className="border-input bg-background mt-1 h-8 w-full rounded-md border px-2 text-sm"
        >
          <option value="">None</option>
          {astrolabes.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name.replace(" Astrolabe", "")}
              {entry.chaosValue > 0 ? ` · ${num(entry.chaosValue)}c` : " · ?"}
            </option>
          ))}
        </select>
        {astrolabe?.chaosValue === 0 && (
          <p className="text-muted-foreground mt-1 text-sm">
            No price yet. The trade site is asked for a few of these a day, so
            one still comes back unknown for a while.
          </p>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Total</span>
          <Price value={total} />
        </div>
        {divine !== undefined && divine > 0 && total >= divine && (
          <div className="text-muted-foreground flex items-center justify-end gap-2 text-sm">
            <Price value={total / divine} currency="divine" size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
