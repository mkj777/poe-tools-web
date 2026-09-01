"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Price } from "@/components/currency";
import { Button } from "@/components/ui/button";
import { SHARED_GRANT, type PricedNode } from "@/lib/scarab-nodes";
import { cn } from "@/lib/utils";

/**
 * The Atlas passives that touch one family of scarabs, priced.
 *
 * Two lists, read in opposite directions and ranked the same way. An exclusion
 * takes a family out of your maps, so its price is what the passive costs you
 * and the cheapest is the one to take. A boost raises how often a family drops,
 * so its price is what the passive is worth and the dearest is the one to take.
 *
 * Both need more than one number. The families are not the same size, so a sum
 * rewards the big ones and an average rewards a family with one expensive
 * scarab in it, and which of those is the fair comparison depends on whether
 * you farm the whole pool or the one line at the top of it.
 */

type SortKey = "total" | "average" | "top";

const SORTS: Record<
  SortKey,
  { label: string; note: string; of: (m: PricedNode) => number }
> = {
  total: {
    label: "One of each",
    note: "Every scarab of the family added up. It rewards the larger families, which is fair when what is at stake is the whole drop pool.",
    of: (m) => m.total,
  },
  average: {
    label: "Average",
    note: "The same pool per scarab. The comparison to use when a family of three should not lose to a family of six for being smaller.",
    of: (m) => m.average,
  },
  top: {
    label: "Dearest",
    note: "The single most expensive scarab of the family, which is usually the only one anybody sets out to farm.",
    of: (m) => m.top,
  },
};

const ORDER = ["total", "average", "top"] as const;

function Scarabs({ node }: { node: PricedNode }) {
  if (node.scarabs.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-2 text-sm text-pretty">
        That content has no scarabs of its own, so this one costs you nothing to
        take.
      </p>
    );
  }

  return (
    <ul className="divide-border/60 divide-y">
      {node.scarabs.map((scarab) => (
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
  node,
  rank,
  metric,
  extreme,
}: {
  node: PricedNode;
  rank: number;
  metric: number;
  /** What the two ends of the list are called here, once they are worth naming. */
  extreme?: string;
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
            <h3 className="font-medium text-pretty">{node.notable}</h3>
            {extreme && (
              <span className="text-primary text-xs">{extreme}</span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
            {node.effect}
            {node.note ? ` ${node.note}` : ""}
          </p>
        </div>
        <Price value={metric} className="shrink-0 font-medium" size={16} />
      </div>

      <div className="border-t py-1">
        <Scarabs node={node} />
      </div>
    </li>
  );
}

function Section({
  id,
  title,
  lead,
  nodes,
  sort,
  most,
  least,
}: {
  id: string;
  title: string;
  lead: string;
  nodes: readonly PricedNode[];
  sort: SortKey;
  /** What to call the top of this list, and the bottom. */
  most: string;
  least: string;
}) {
  const ranked = useMemo(() => {
    const of = SORTS[sort].of;
    return [...nodes].sort((a, b) => of(b) - of(a));
  }, [nodes, sort]);

  if (ranked.length === 0) return null;

  // With no prices at all every card ties at nothing, and the two ends would be
  // whichever order the list happened to be in.
  const ends = ranked.length > 1 && SORTS[sort].of(ranked[0]) > 0;

  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground mt-1 mb-4 max-w-3xl text-sm text-pretty">
        {lead}
      </p>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 rail:grid-cols-3">
        {ranked.map((node, i) => (
          <Card
            key={node.id}
            node={node}
            rank={i + 1}
            metric={SORTS[sort].of(node)}
            extreme={
              !ends
                ? undefined
                : i === 0
                  ? most
                  : i === ranked.length - 1
                    ? least
                    : undefined
            }
          />
        ))}
      </ul>
    </section>
  );
}

export function ScarabNodes({
  exclusions,
  boosts,
}: {
  exclusions: readonly PricedNode[];
  boosts: readonly PricedNode[];
}) {
  const [sort, setSort] = useState<SortKey>("total");

  if (exclusions.length === 0 && boosts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        The currency exchange has no scarab prices for this league yet.
      </p>
    );
  }

  return (
    <>
      {/* One control for both lists: the three numbers mean the same thing in
          each, only the direction you read them in changes. */}
      <div className="flex flex-wrap items-center gap-2">
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
      <p className="text-muted-foreground mt-3 mb-8 max-w-3xl text-sm text-pretty">
        {SORTS[sort].note}
      </p>

      <Section
        id="turn-content-off"
        title="Turn content off"
        lead={`Each of these takes one mechanic out of your maps and its scarabs with it, so what the family sells for is what the passive costs you. The content you can most afford to give up is at the bottom. All twelve give back the same thing: ${SHARED_GRANT}.`}
        nodes={exclusions}
        sort={sort}
        most="costs the most"
        least="costs the least"
      />

      <Section
        id="find-more"
        title="Find more of them"
        lead="Each of these raises how often one family of scarabs drops for you. Read the other way round: here the number is what the passive is worth taking for, so the best of them is at the top."
        nodes={boosts}
        sort={sort}
        most="worth the most"
        least="worth the least"
      />
    </>
  );
}
