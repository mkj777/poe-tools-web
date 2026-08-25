"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { minutesUntil } from "@/lib/refresh";

/** Four times a minute, so the number never sits a whole minute out of date. */
const TICK = 15_000;

/**
 * How long the prices on this page have left. The page is built once and then
 * served from the CDN until it is `interval` seconds old, so the moment it was
 * built is the only thing the server can say, and the countdown itself belongs
 * to the visitor's clock: it starts at hydration, which is also why the first
 * paint carries the interval alone and no number.
 */
export function PriceClock({
  generated,
  interval,
}: {
  /** When the prices on this page were fetched, in epoch milliseconds. */
  generated: number;
  /** Seconds between rebuilds. */
  interval: number;
}) {
  const due = generated + interval * 1000;
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(minutesUntil(due, Date.now()));
    tick();
    const timer = setInterval(tick, TICK);
    return () => clearInterval(timer);
  }, [due]);

  return (
    <span
      className="text-muted-foreground flex items-center gap-1.5 text-sm"
      title={`Prices come from poe.ninja and are refetched every ${Math.round(interval / 60)} minutes`}
    >
      <RefreshCw className="size-3.5 shrink-0" />
      {/* Short enough to ride along at the end of the controls; the sentence
          it stands for is in the title. */}
      <span className="tabular-nums whitespace-nowrap">
        every {Math.round(interval / 60)} min
        {left !== null && (left > 0 ? ` · next in ${left}` : " · due now")}
      </span>
    </span>
  );
}
