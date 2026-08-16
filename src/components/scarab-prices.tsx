import Image from "next/image";
import type { ReactNode } from "react";
import type { Scarab } from "@/lib/ninja";
import { CurrencyIcon, Price } from "@/components/currency";

function Card({
  icon,
  name,
  title,
  children,
}: {
  icon?: ReactNode;
  name: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      title={title ?? name}
      className="bg-card flex items-center gap-2.5 rounded-xl border px-3 py-2"
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

/**
 * What a beast run costs to set up. Scarabs are bought by the stack, so the
 * bulk figures matter more than the unit price, and "Map" is one map's worth
 * of them: 20 Duplicating, 40 of the Herd, 40 Kalguuran. The divine rate
 * rides along because every larger price is quoted in it.
 */
export function ScarabPrices({
  scarabs,
  divine,
}: {
  scarabs: Scarab[];
  divine?: number;
}) {
  if (scarabs.length === 0 && divine === undefined) return null;

  const total = scarabs.reduce((sum, s) => sum + s.chaosValue * s.run, 0);
  const composition = scarabs.map((s) => `${s.run} ${s.name}`).join(" + ");

  return (
    <div className="flex flex-col items-stretch gap-2">
      {scarabs.map((scarab, i) => (
        <Card
          key={scarab.id}
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

          {/* What one map's worth of scarabs costs, on the last card's line. */}
          {i === scarabs.length - 1 && (
            <span
              title={composition}
              className="text-foreground flex items-center gap-1"
            >
              Map
              <Price value={total} size={15} />
            </span>
          )}
        </Card>
      ))}

      {divine !== undefined && (
        <Card
          name="Divine Orb"
          icon={<CurrencyIcon currency="divine" size={26} />}
        >
          <Price value={divine} size={15} className="text-foreground" />
        </Card>
      )}
    </div>
  );
}
