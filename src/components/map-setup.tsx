"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Price } from "@/components/currency";
import type { ExchangeItem } from "@/lib/ninja";
import { num } from "@/lib/utils";

/**
 * What one map costs to set up, from what you actually put in the device.
 *
 * Both prices are poe.ninja's currency exchange, which quotes scarabs and
 * astrolabes alike. Nothing here reaches the network.
 */

/** A setup survives a reload. Retyping five scarabs every visit is not a tool. */
const SAVED = "map-regex:setup";

/**
 * Counts are kept as typed rather than as numbers. Clearing a field is how you
 * start retyping it, so an empty one has to stay an empty one instead of
 * becoming a zero, or a row that ought to vanish. Only the X removes a scarab.
 */
type Setup = { counts: Record<string, string>; astrolabe: string | null };

const EMPTY: Setup = { counts: {}, astrolabe: null };

/** What "no astrolabe" is called inside the select, which cannot take "". */
const NONE = "none";

function load(): Setup {
  try {
    const raw = localStorage.getItem(SAVED);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as {
      counts?: Record<string, string | number>;
      astrolabe?: string | null;
    };
    // A setup saved before counts became text still reads back.
    const counts = Object.fromEntries(
      Object.entries(parsed.counts ?? {}).map(([id, n]) => [id, String(n)]),
    );
    return { counts, astrolabe: parsed.astrolabe ?? null };
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
  scarabs: ExchangeItem[];
  astrolabes: ExchangeItem[];
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
    .flatMap(([id, typed]) => {
      const scarab = byId.get(id);
      return scarab ? [{ scarab, typed, count: Number(typed) || 0 }] : [];
    })
    .sort((a, b) => a.scarab.name.localeCompare(b.scarab.name));

  const astrolabe = astrolabes.find((a) => a.id === setup.astrolabe);

  const total =
    chosen.reduce(
      (sum, { scarab, count }) => sum + scarab.chaosValue * count,
      0,
    ) + (astrolabe?.chaosValue ?? 0);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? scarabs
        .filter(
          (scarab) =>
            scarab.name.toLowerCase().includes(needle) &&
            !(scarab.id in setup.counts),
        )
        .slice(0, 8)
    : [];

  const setCount = (id: string, typed: string) =>
    setupStore.write({
      ...setup,
      counts: { ...setup.counts, [id]: typed.replace(/\D/g, "").slice(0, 4) },
    });

  const remove = (id: string) => {
    const counts = { ...setup.counts };
    delete counts[id];
    setupStore.write({ ...setup, counts });
  };

  return (
    <div className="bg-card divide-y rounded-xl border">
      <div className="px-3 py-2">
        <div className="text-sm font-medium">Setup</div>
        <div className="text-muted-foreground text-sm">What one map costs</div>
      </div>

      {chosen.map(({ scarab, typed, count }) => (
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
            value={typed}
            onChange={(e) => setCount(scarab.id, e.target.value)}
            className="h-8 w-14 shrink-0 text-right tabular-nums"
          />
          <button
            onClick={() => remove(scarab.id)}
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
                  setCount(scarab.id, "1");
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
        {/* Radix rather than a bare <select>, so the list is drawn by the page
            and wears the theme instead of the operating system's own widget. */}
        <label className="text-muted-foreground text-sm" id="astrolabe-label">
          Astrolabe
        </label>
        <Select
          value={setup.astrolabe ?? NONE}
          onValueChange={(value) =>
            setupStore.write({
              ...setup,
              astrolabe: value === NONE ? null : value,
            })
          }
        >
          <SelectTrigger
            className="mt-1 w-full"
            aria-labelledby="astrolabe-label"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {astrolabes.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name.replace(" Astrolabe", "")} · {num(entry.chaosValue)}
                c
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
