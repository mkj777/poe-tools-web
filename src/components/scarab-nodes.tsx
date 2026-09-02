"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Price } from "@/components/currency";
import { ToolIcon } from "@/components/tool-icon";
import { Button } from "@/components/ui/button";
import type { PricedNode } from "@/lib/scarab-nodes";
import { cn } from "@/lib/utils";

/**
 * The Atlas passives that touch one family of scarabs, priced.
 *
 * Two lists, ranked the same way and read in opposite directions: an exclusion
 * takes a family out of your maps, so its price is what it costs you, and a
 * boost raises how often a family drops, so its price is what it is worth.
 *
 * They stand side by side because that is the comparison. Stacked, the second
 * list read as an afterthought to the first; beside it, and sorted by the same
 * number, what you give up and what you gain are one decision.
 *
 * Three numbers rather than one, because the families are not the same size.
 * The buttons are the whole explanation: a page that has to say in a paragraph
 * what a sum and an average are is not worth the paragraph.
 */

type SortKey = "total" | "average" | "top";

const SORTS: Record<SortKey, { label: string; of: (m: PricedNode) => number }> =
  {
    total: { label: "One of each", of: (m) => m.total },
    average: { label: "Average", of: (m) => m.average },
    top: { label: "Dearest", of: (m) => m.top },
  };

const ORDER = ["total", "average", "top"] as const;

function Scarabs({ node }: { node: PricedNode }) {
  if (node.scarabs.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-2 text-sm">
        No scarabs of its own.
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
        <span className="text-muted-foreground w-4 shrink-0 pt-1.5 text-sm tabular-nums">
          {rank}
        </span>
        {/* The art the Atlas tree draws for this passive. It says nothing
            about the scarabs below it: Crystalline Carapaces finds Essence
            scarabs and wears the Harvest art. It is here to be recognised on
            the tree, not to be read. */}
        <ToolIcon
          icon={{ src: `/atlas/${node.id}.png`, rounded: true }}
          className="mt-0.5 size-9"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-medium text-pretty">{node.notable}</h3>
            {extreme && <span className="text-primary text-xs">{extreme}</span>}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
            {node.effect}
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
  nodes,
  sort,
  most,
  least,
}: {
  id: string;
  title: string;
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
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-lg font-semibold tracking-tight">
        {title}
      </h2>

      {/* One column once the two lists are side by side, two while they are
          stacked, so a card is never dragged across the whole window. */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
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
      <div className="mb-8 flex flex-wrap items-center gap-2">
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

      {/* Side by side from the width where two columns of cards still hold a
          scarab name, and one under the other below it. */}
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-6">
        <Section
          id="turn-content-off"
          title="Turn content off"
          nodes={exclusions}
          sort={sort}
          most="costs the most"
          least="costs the least"
        />

        <Section
          id="find-more"
          title="Find more of them"
          nodes={boosts}
          sort={sort}
          most="worth the most"
          least="worth the least"
        />
      </div>
    </>
  );
}
