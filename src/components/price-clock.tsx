"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ago, minutesSince } from "@/lib/refresh";

/** Four times a minute, so the age never sits a whole minute out of date. */
const TICK = 15_000;

/**
 * How old the prices on this page are. Both the age and the exact time behind
 * it are read on the visitor's clock, in their timezone, so neither exists
 * before hydration: a server that rendered either would be rendering its own
 * clock, in its own timezone, a moment before the paint.
 */
export function PriceClock({
  fetchedAt,
}: {
  /** When poe.ninja handed over these prices, in epoch milliseconds. */
  fetchedAt: number;
}) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMinutes(minutesSince(fetchedAt, Date.now()));
    tick();
    const timer = setInterval(tick, TICK);
    return () => clearInterval(timer);
  }, [fetchedAt]);

  return (
    <span
      className="text-muted-foreground flex items-center gap-1.5 text-sm"
      title={
        minutes === null
          ? undefined
          : `Prices from poe.ninja, fetched ${new Date(fetchedAt).toLocaleString()}`
      }
    >
      <RefreshCw className="size-3.5 shrink-0" />
      <span className="tabular-nums whitespace-nowrap">
        Updated {minutes !== null && ago(minutes)}
      </span>
    </span>
  );
}
