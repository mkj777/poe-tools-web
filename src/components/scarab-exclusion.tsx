"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Price } from "@/components/currency";
import { Button } from "@/components/ui/button";
import { SHARED_GRANT, type MechanicPrices } from "@/lib/scarab-exclusion";
import { cn } from "@/lib/utils";

/**
 * The twelve, priced.
 *
 * Each one takes a mechanic out of your maps, which takes that mechanic's
 * scarabs out of the economy you are running. So the question is what each one
 * costs you, and the only honest way to ask it is with more than one number:
 * the families are not the same size, so a sum rewards the big ones and an
 * average rewards a family with one expensive scarab in it.
 */

type SortKey = "total" | "average" | "top";

const SORTS: Record<
  SortKey,
  { label: string; note: string; of: (m: MechanicPrices) => number }
> = {
  total: {
    label: "One of each",
    note: "Every scarab of the mechanic added up. It rewards the larger families, which is fair when what you are giving up is the whole drop pool.",
    of: (m) => m.total,
  },
  average: {
    label: "Average",
    note: "The same pool per scarab. The comparison to use when a family of three should not lose to a family of six for being smaller.",
    of: (m) => m.average,
  },
  top: {
    label: "Dearest",
    note: "The single most expensive scarab of the mechanic, which is usually the only one anybody sets out to farm.",
    of: (m) => m.top,
  },
};

const ORDER = ["total", "average", "top"] as const;

function Scarabs({ mechanic }: { mechanic: MechanicPrices }) {
  if (mechanic.scarabs.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-2 text-sm text-pretty">
        {mechanic.disables} have no scarabs of their own, so this one costs you
        nothing to take.
      </p>
    );
  }

  return (
    <ul className="divide-border/60 divide-y">
      {mechanic.scarabs.map((scarab) => (
        <li
          key={scarab.id}
          className="flex items-center gap-2.5 px-3 py-1.5 text-sm"
        >
          <Image
            src={scarab.icon}
            alt=""
            width={28}
            height={28}
            className="size-6 shrink-0 object-contain"
          />
          {/* The family is the heading of the card, so a row only has to carry
              what tells one scarab of it from another. */}
          <span className="min-w-0 flex-1 truncate" title={scarab.name}>
            {scarab.short}
          </span>
          <Price value={scarab.chaosValue} size={15} />
        </li>
      ))}
    </ul>
  );
}

function Card({
  mechanic,
  rank,
  metric,
  extreme,
}: {
  mechanic: MechanicPrices;
  rank: number;
  metric: number;
  /** The cheapest and the dearest are what the page is read for. */
  extreme?: "least" | "most";
}) {
  return (
    <li
      className={cn(
        "bg-card/40 flex flex-col rounded-xl border",
        extreme ? "border-primary/40" : "border-border/60",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <span className="text-muted-foreground w-4 shrink-0 pt-0.5 text-sm tabular-nums">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-medium text-pretty">{mechanic.keystone}</h3>
            {extreme && (
              <span className="text-primary text-xs">
                {extreme === "most" ? "costs the most" : "costs the least"}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
            Disables {mechanic.disables}.
            {mechanic.note ? ` ${mechanic.note}` : ""}
          </p>
        </div>
        <Price value={metric} className="shrink-0 font-medium" size={16} />
      </div>

      <div className="border-t py-1">
        <Scarabs mechanic={mechanic} />
      </div>
    </li>
  );
}

export function ScarabExclusion({
  mechanics,
}: {
  mechanics: readonly MechanicPrices[];
}) {
  const [sort, setSort] = useState<SortKey>("total");

  const ranked = useMemo(() => {
    const of = SORTS[sort].of;
    return [...mechanics].sort((a, b) => of(b) - of(a));
  }, [mechanics, sort]);

  if (ranked.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        The currency exchange has no scarab prices for this league yet.
      </p>
    );
  }

  const most = ranked[0];
  const least = ranked[ranked.length - 1];
  // With no prices at all every card ties at nothing, and the two ends would be
  // whichever order the list happened to be in.
  const ends = ranked.length > 1 && SORTS[sort].of(most) > 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Compare by</span>
        {ORDER.map((key) => (
          <Button
            key={key}
            size="sm"
            variant={key === sort ? "secondary" : "ghost"}
            onClick={() => setSort(key)}
            aria-pressed={key === sort}
            // A finger needs more than the 30px a small button is. Everything
            // else on the page a thumb reaches for is already 44.
            className="pointer-coarse:h-11 pointer-coarse:px-4"
          >
            {SORTS[key].label}
          </Button>
        ))}
      </div>

      <p className="text-muted-foreground mb-6 max-w-3xl text-sm text-pretty">
        {SORTS[sort].note} All twelve give back the same thing: {SHARED_GRANT}.
      </p>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 rail:grid-cols-3">
        {ranked.map((mechanic, i) => (
          <Card
            key={mechanic.id}
            mechanic={mechanic}
            rank={i + 1}
            metric={SORTS[sort].of(mechanic)}
            extreme={
              !ends
                ? undefined
                : mechanic === most
                  ? "most"
                  : mechanic === least
                    ? "least"
                    : undefined
            }
          />
        ))}
      </ul>
    </>
  );
}
