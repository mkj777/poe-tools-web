import Image from "next/image";
import type { ReactNode } from "react";
import type { Scarab } from "@/lib/ninja";
import { CurrencyIcon, Price } from "@/components/currency";

function Card({
  icon,
  name,
  children,
}: {
  icon: ReactNode;
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-card flex items-center gap-2.5 rounded-xl border px-3 py-2">
      {icon}
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-muted-foreground flex items-center gap-2.5 text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * What a beast run costs to set up. Both scarabs are bought by the stack, so
 * the price of a full stack of 20 matters as much as the unit price. The
 * divine rate rides along because every larger price is quoted in it.
 */
export function ScarabPrices({
  scarabs,
  divine,
}: {
  scarabs: Scarab[];
  divine?: number;
}) {
  if (scarabs.length === 0 && divine === undefined) return null;

  return (
    <div className="flex flex-col items-stretch gap-2">
      {scarabs.map((scarab) => (
        <Card
          key={scarab.id}
          name={scarab.name}
          icon={
            <Image
              src={scarab.icon}
              alt=""
              width={30}
              height={30}
              className="shrink-0"
            />
          }
        >
          <Price
            value={scarab.chaosValue}
            size={15}
            className="text-foreground"
          />
          <span className="flex items-center gap-1">
            20×
            <Price value={scarab.chaosValue * 20} size={15} />
          </span>
        </Card>
      ))}

      {divine !== undefined && (
        <Card
          name="Divine Orb"
          icon={<CurrencyIcon currency="divine" size={30} />}
        >
          <Price value={divine} size={15} className="text-foreground" />
        </Card>
      )}
    </div>
  );
}
