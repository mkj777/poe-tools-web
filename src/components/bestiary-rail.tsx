import Image from "next/image";
import type { ReactNode } from "react";
import type { ExchangeItem } from "@/lib/ninja";
import { cn } from "@/lib/utils";
import { CurrencyIcon, Price } from "@/components/currency";
import { BestiaryThreadCost } from "@/components/bestiary-thread";

/** One line of a card: what it is on the left, what it costs under it. */
function Row({
  icon,
  name,
  title,
  className,
  children,
}: {
  icon?: ReactNode;
  name: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      title={title ?? name}
      className={cn("flex items-center gap-2.5 px-3 py-2", className)}
    >
      {icon}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        {/* The column is only as wide as the page gutter, so a long line
            wraps rather than running off the edge of the window. */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A card is one or more rows, ruled off from each other. */
function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card divide-y rounded-xl border", className)}>
      {children}
    </div>
  );
}

/**
 * The rates at the top of the economy, then what a beast run costs to set up:
 * since 3.30 that is Bestiary Threads, as many per map as the player puts in.
 */
export function BestiaryRail({
  thread,
  divine,
  mirror,
  mirrorChaos,
}: {
  /** The Bestiary Thread, when poe.ninja prices it. */
  thread?: ExchangeItem;
  /** Chaos per Divine Orb. */
  divine?: number;
  /** Divines per Mirror of Kalandra. */
  mirror?: number;
  /** The same mirror in chaos, for the line under it. */
  mirrorChaos?: number;
}) {
  if (thread === undefined && divine === undefined && mirror === undefined) {
    return null;
  }

  return (
    /* One column in the rail, and a row of cards when the rail has had to
       become a block over the table on a narrower window. */
    <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 rail:grid-cols-1">
      {mirror !== undefined && (
        <Card>
          <Row
            name="Mirror"
            title="Mirror of Kalandra"
            icon={
              <Image
                src="/Mirror_of_Kalandra_inventory_icon.png"
                alt=""
                width={26}
                height={26}
                className="shrink-0"
              />
            }
          >
            <Price
              value={mirror}
              currency="divine"
              size={15}
              className="text-foreground"
            />
            {mirrorChaos !== undefined && (
              <Price value={mirrorChaos} size={15} />
            )}
          </Row>
        </Card>
      )}

      {divine !== undefined && (
        <Card>
          <Row
            name="Divine Orb"
            icon={<CurrencyIcon currency="divine" size={26} />}
          >
            <Price value={divine} size={15} className="text-foreground" />
          </Row>
        </Card>
      )}

      {thread !== undefined && (
        <BestiaryThreadCost
          thread={thread}
          className="col-span-2 sm:col-span-1"
        />
      )}
    </div>
  );
}
