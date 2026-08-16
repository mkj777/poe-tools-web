import Image from "next/image";
import type { Scarab } from "@/lib/ninja";
import { Price } from "@/components/currency";

/**
 * What a beast run costs to set up. Both scarabs are bought by the stack, so
 * the price of a full stack of 20 matters as much as the unit price.
 */
export function ScarabPrices({ scarabs }: { scarabs: Scarab[] }) {
  if (scarabs.length === 0) return null;

  return (
    <div className="flex flex-col items-stretch gap-2">
      {scarabs.map((scarab) => (
        <div
          key={scarab.id}
          className="bg-card flex items-center gap-2.5 rounded-xl border px-3 py-2"
        >
          <Image
            src={scarab.icon}
            alt=""
            width={30}
            height={30}
            className="shrink-0"
          />
          <div>
            <div className="text-sm font-medium">{scarab.name}</div>
            <div className="text-muted-foreground flex items-center gap-2.5 text-sm">
              <Price
                value={scarab.chaosValue}
                size={15}
                className="text-foreground"
              />
              <span className="flex items-center gap-1">
                20×
                <Price value={scarab.chaosValue * 20} size={15} />
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
