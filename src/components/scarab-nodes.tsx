import Image from "next/image";
import { Price } from "@/components/currency";
import { ToolIcon } from "@/components/tool-icon";
import type { PricedNode } from "@/lib/scarab-nodes";

/**
 * The Atlas passives that touch one family of scarabs, priced.
 *
 * Two lists, ranked on the same number and ordered against each other: an
 * exclusion takes a family out of your maps, so its price is what it costs you
 * and the cheapest is the one to take first, while a boost doubles how often a
 * family drops, so its price is what it is worth and the dearest leads.
 *
 * They stand side by side because that is the comparison. Stacked, the second
 * list read as an afterthought to the first; beside it, and sorted by the same
 * number, what you give up and what you gain are one decision.
 *
 * One number, and it is what the next scarab of the family is worth. The sum of
 * a family's price list, its average and its dearest single scarab were offered
 * here as well, and all three answer a question nobody has: each counts a
 * scarab nobody ever sees for as much as one that drops every other map. A
 * ranking you have to pick between is one the page has not made.
 *
 * With nothing left to choose there is nothing to hold state for, so this ships
 * no JavaScript.
 */

/** A share, read to a tenth only while it is small enough to need one. */
const pct = (share: number) =>
  `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;

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
          {/* How much of this family's drops are this one scarab. The dearest
              of a family is usually the thinnest bar in it, and that is the
              whole argument of the page without a word of it. */}
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
          <span
            className="min-w-0 flex-1 truncate"
            title={
              scarab.tier
                ? `${scarab.name} · ${scarab.tier}, ${pct(scarab.share)} of the family's scarabs`
                : scarab.name
            }
          >
            {scarab.name}
          </span>
          {/* The bar says it at a glance and this says it to a tenth, because
              the whole question the page answers is how much of a family one
              scarab of it actually is. */}
          {scarab.tier && (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {pct(scarab.share)}
            </span>
          )}
          <Price value={scarab.chaosValue} size={15} />
        </li>
      ))}
    </ul>
  );
}

/**
 * One passive. Its id is the anchor the palette sends a reader to, so the
 * card scrolls in under the bar a phone keeps at the top and wears a ring
 * while it is the one that was asked for.
 */
function Card({ node, rank }: { node: PricedNode; rank: number }) {
  return (
    <li
      id={node.id}
      className="bg-card/40 border-border/60 flex scroll-mt-20 flex-col rounded-xl border target:ring-1 target:ring-ring"
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
          <h3 className="font-medium text-pretty">{node.notable}</h3>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
            {node.effect}
          </p>
        </div>
        {/* Where the number says what it is, now that no line above it does.
            The questions at the bottom carry the rest, including whose
            measurement the drop chances are. */}
        <span
          className="shrink-0"
          title="What the next scarab of this family is worth, each of them counting for as often as it drops"
        >
          <Price value={node.expected} className="font-medium" size={16} />
        </span>
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
  lead,
}: {
  id: string;
  title: string;
  nodes: readonly PricedNode[];
  /** Which end of the list is the one to act on, and so goes first. */
  lead: "cheapest" | "dearest";
}) {
  if (nodes.length === 0) return null;

  const sign = lead === "dearest" ? -1 : 1;
  const ranked = [...nodes].sort((a, b) => sign * (a.expected - b.expected));

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-lg font-semibold tracking-tight">
        {title}
      </h2>

      {/* One column once the two lists are side by side, two while they are
          stacked, so a card is never dragged across the whole window. */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
        {ranked.map((node, i) => (
          <Card key={node.id} node={node} rank={i + 1} />
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
  if (exclusions.length === 0 && boosts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        The currency exchange has no scarab prices for this league yet.
      </p>
    );
  }

  return (
    // Side by side from the width where two columns of cards still hold a
    // scarab name, and one under the other below it.
    <div className="grid gap-10 xl:grid-cols-2 xl:gap-6">
      {/* Cheapest first: the content you can drop for the least is the
          content to drop. */}
      <Section
        id="turn-content-off"
        title="Turn content off"
        nodes={exclusions}
        lead="cheapest"
      />

      {/* And dearest first, for the same reason read the other way. Doubled
          rather than merely raised: every one of the nine says "100% increased
          chance to be X Scarabs" in the card under this heading. */}
      <Section
        id="double-drop-chance"
        title="Double drop chance"
        nodes={boosts}
        lead="dearest"
      />
    </div>
  );
}
