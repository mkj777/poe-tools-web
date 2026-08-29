import Image from "next/image";
import type { ReactNode } from "react";
import type { Scarab } from "@/lib/ninja";
import { cn } from "@/lib/utils";
import { CurrencyIcon, Price } from "@/components/currency";

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
 * The rates at the top of the economy, then what a beast run costs to set up.
 * Scarabs are bought by the stack, so the bulk figures matter more than the
 * unit price, and they share one card because the total under them — 20
 * Duplicating, 40 of the Herd, 40 Kalguuran, one map's worth — is the number
 * the three of them add up to.
 */
export function ScarabPrices({
  scarabs,
  divine,
  mirror,
  mirrorChaos,
}: {
  scarabs: Scarab[];
  /** Chaos per Divine Orb. */
  divine?: number;
  /** Divines per Mirror of Kalandra. */
  mirror?: number;
  /** The same mirror in chaos, for the line under it. */
  mirrorChaos?: number;
}) {
  if (scarabs.length === 0 && divine === undefined && mirror === undefined) {
    return null;
  }

  const total = scarabs.reduce((sum, s) => sum + s.chaosValue * s.run, 0);
  const composition = scarabs.map((s) => `${s.run} ${s.name}`).join(" + ");

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

      {scarabs.length > 0 && (
        <Card className="col-span-2 sm:col-span-1">
          {/* What the three cost one by one is a rail's worth of detail. On a
              phone the band is over the table, where the total is the whole
              answer and three more rows are three screens of scrolling. */}
          {scarabs.map((scarab) => (
            <Row
              key={scarab.id}
              className="max-sm:hidden"
              name={scarab.name}
              title={scarab.fullName}
              icon={
                <Image
                  src={scarab.icon}
                  alt=""
                  width={26}
                  height={26}
                  className="shrink-0"
                />
              }
            >
              {scarab.show.map((count) =>
                count === 1 ? (
                  <Price
                    key={count}
                    value={scarab.chaosValue}
                    size={15}
                    className="text-foreground"
                  />
                ) : (
                  <span key={count} className="flex items-center">
                    {count}×
                    <Price value={scarab.chaosValue * count} size={15} />
                  </span>
                ),
              )}
            </Row>
          ))}

          {/* What one map's worth of all three costs, under the three. */}
          <div
            title={composition}
            className="text-foreground flex flex-wrap items-center justify-between gap-x-2.5 px-3 py-2 text-sm font-medium"
          >
            Total
            <Price value={total} size={15} />
          </div>
        </Card>
      )}
    </div>
  );
}
