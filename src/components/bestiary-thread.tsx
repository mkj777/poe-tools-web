"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/currency";
import type { ExchangeItem } from "@/lib/ninja";
import { createStorageStore } from "@/lib/storage-store";
import { MAX_THREADS, MIN_THREADS, threadCount } from "@/lib/thread-count";
import { cn } from "@/lib/utils";

/** One digit. Anything else is not a count of Threads. */
const digit = (typed: string) => typed.replace(/\D/g, "").slice(-1);

/**
 * The digit just typed, wherever the caret was: a key pressed before or after
 * the digit already there replaces it instead of being thrown away.
 */
const typedDigit = (value: string, before: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2) return digits;
  return digits.replace(before, "").slice(-1) || digits.slice(-1);
};

/**
 * How many Threads a map gets survives a reload, the way the map page's setup
 * does. Kept as typed, so an emptied field stays empty while it is retyped;
 * the total reads it through `threadCount`. createStorageStore already
 * swallows a browser that refuses storage.
 */
const countStore = createStorageStore<string>(
  "beast-prices:threads",
  digit,
  String(MIN_THREADS),
  String,
);

/**
 * What a beast run costs to set up since 3.30: Bestiary Threads, one to
 * eight a map. The unit price is poe.ninja's, the count is the player's.
 */
export function BestiaryThreadCost({
  thread,
  className,
}: {
  thread: ExchangeItem;
  className?: string;
}) {
  const typed = useSyncExternalStore(
    countStore.subscribe,
    countStore.read,
    countStore.server,
  );
  const count = threadCount(typed);

  return (
    <div className={cn("bg-card divide-y rounded-xl border", className)}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <Image
          src={thread.icon}
          alt=""
          width={26}
          height={26}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1" title={thread.name}>
          <div className="truncate text-sm font-medium">{thread.name}</div>
          <div className="text-muted-foreground text-sm">
            <Price
              value={thread.chaosValue}
              size={15}
              className="text-foreground"
            />
          </div>
        </div>
        <Input
          inputMode="numeric"
          aria-label="Bestiary Threads per map"
          title={`Threads per map, ${MIN_THREADS} to ${MAX_THREADS}`}
          value={typed}
          onChange={(e) => countStore.write(typedDigit(e.target.value, typed))}
          onFocus={(e) => e.currentTarget.select()}
          // Leaving the field shows the count the total is built from.
          onBlur={() => countStore.write(String(count))}
          className="h-8 w-12 shrink-0 text-right tabular-nums"
        />
      </div>

      <div
        title={`${count} ${thread.name}${count === 1 ? "" : "s"} per map`}
        className="text-foreground flex flex-wrap items-center justify-between gap-x-2.5 px-3 py-2 text-sm font-medium"
      >
        Total
        <Price value={thread.chaosValue * count} size={15} />
      </div>
    </div>
  );
}
