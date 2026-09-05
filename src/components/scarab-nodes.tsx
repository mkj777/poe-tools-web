"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Price } from "@/components/currency";
import { ToolIcon } from "@/components/tool-icon";
import { Button } from "@/components/ui/button";
import type { PricedNode } from "@/lib/scarab-nodes";

/**
 * The Atlas passives that touch one family of scarabs, priced.
 *
 * Two lists, ranked on the same number and ordered against each other: an
 * exclusion takes a family out of your maps, so its price is what it costs you
 * and the cheapest is the one to take first, while a boost raises how often a
 * family drops, so its price is what it is worth and the dearest leads.
 *
 * They stand side by side because that is the comparison. Stacked, the second
 * list read as an afterthought to the first; beside it, and sorted by the same
 * number, what you give up and what you gain are one decision.
 *
 * Three numbers rather than one, because the families are not the same size.
 * The buttons are the whole explanation: a page that has to say in a paragraph
 * what a sum and an average are is not worth the paragraph.
 */

type SortKey = "expected" | "total" | "average" | "top";

const SORTS: Record<
  SortKey,
  { label: string; says: string; of: (m: PricedNode) => number }
> = {
  expected: {
    label: "Per drop",
    says: "What one scarab of the family is worth, each of them counting for as often as its rarity tier drops",
    of: (m) => m.expected,
  },
  total: {
    label: "One of each",
    says: "One of every scarab of the family, added up",
    of: (m) => m.total,
  },
  average: {
    label: "Average",
    says: "That total split across the family, however rare its scarabs are",
    of: (m) => m.average,
  },
  top: {
    label: "Dearest",
    says: "The single dearest scarab of the family, however rare it is",
    of: (m) => m.top,
  },
};

// Per drop first and by default: the other three count a scarab nobody sees
// for as much as one that drops every other map.
const ORDER = ["expected", "total", "average", "top"] as const;

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
          className="relative isolate flex items-center gap-2.5 px-3 py-1.5 text-sm"
        >
          {/* How much of everything this family trades is this one scarab.
              The dearest of a family is usually the thinnest bar in it, and
              that is the whole argument of the page without a word of it. */}
          <span
            aria-hidden
            className="bg-foreground/6 absolute inset-y-px left-0 -z-10 rounded-r-sm"
            style={{ width: `${scarab.share * 100}%` }}
          />
          <Image
            src={scarab.icon}
            alt=""
            width={28}
            height={28}
            className="size-6 shrink-0 object-contain"
          />
          <span className="min-w-0 flex-1 truncate" title={scarab.name}>
            {scarab.name}
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
}: {
  node: PricedNode;
  rank: number;
  metric: number;
}) {
  return (
    <li className="bg-card/40 border-border/60 flex flex-col rounded-xl border">
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
          <h3 className="font-medium text-pretty">{node.notable}</h3>
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
  lead,
}: {
  id: string;
  title: string;
  nodes: readonly PricedNode[];
  sort: SortKey;
  /** Which end of the list is the one to act on, and so goes first. */
  lead: "cheapest" | "dearest";
}) {
  const ranked = useMemo(() => {
    const of = SORTS[sort].of;
    const sign = lead === "dearest" ? -1 : 1;
    return [...nodes].sort((a, b) => sign * (of(a) - of(b)));
  }, [nodes, sort, lead]);

  if (ranked.length === 0) return null;

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
  const [sort, setSort] = useState<SortKey>("expected");

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
            title={SORTS[key].says}
            // A finger needs more than the 30px a small button is. Everything
            // else on the page a thumb reaches for is already 44.
            className="pointer-coarse:h-11 pointer-coarse:px-4"
          >
            {SORTS[key].label}
          </Button>
        ))}
      </div>

      {/* The one thing the leading number cannot say for itself. GGG has never
          published what the five tiers are worth against each other, and a
          page that ranks on them owes the reader that in the open rather than
          in a paragraph nobody reaches. */}
      {sort === "expected" && (
        <p className="text-muted-foreground -mt-6 mb-8 text-xs">
          Weighted by each scarab&rsquo;s rarity tier, measured by players
          rather than published by GGG.
        </p>
      )}

      {/* Side by side from the width where two columns of cards still hold a
          scarab name, and one under the other below it. */}
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-6">
        {/* Cheapest first: the content you can drop for the least is the
            content to drop. */}
        <Section
          id="turn-content-off"
          title="Turn content off"
          nodes={exclusions}
          sort={sort}
          lead="cheapest"
        />

        {/* And dearest first, for the same reason read the other way. */}
        <Section
          id="find-more"
          title="Find more of them"
          nodes={boosts}
          sort={sort}
          lead="dearest"
        />
      </div>
    </>
  );
}
