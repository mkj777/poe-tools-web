"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { minutesUntil } from "@/lib/refresh";

/** Four times a minute, so the number never sits a whole minute out of date. */
const TICK = 15_000;

/**
 * How long the prices on this page have left. The countdown belongs to the
 * visitor's clock and starts at hydration, which is why the first paint carries
 * the interval alone and no number: a server that renders the count would be
 * caught out by every second between its render and the paint.
 */
export function PriceClock({
  fetchedAt,
  interval,
}: {
  /** When poe.ninja handed over these prices, in epoch milliseconds. */
  fetchedAt: number;
  /** Seconds before they are fetched again. */
  interval: number;
}) {
  const due = fetchedAt + interval * 1000;
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
