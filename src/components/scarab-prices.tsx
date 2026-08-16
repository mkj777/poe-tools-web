import Image from "next/image";
import type { Scarab } from "@/lib/ninja";

const chaos = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: value < 10 ? 1 : 0,
  });

/**
 * What a beast run costs to set up. Both scarabs are bought by the stack, so
 * the bulk figures matter more than the unit price — 20 for Duplicating, and
 * 40 for the Herd since two full stacks is the usual buy.
 */
export function ScarabPrices({ scarabs }: { scarabs: Scarab[] }) {
  if (scarabs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {scarabs.map((scarab) => {
        const bulk = [20, ...(scarab.id.endsWith("herd") ? [40] : [])];

        return (
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
              <div className="text-muted-foreground flex gap-2.5 text-sm tabular-nums">
                <span className="text-foreground">
                  {chaos(scarab.chaosValue)}c
                </span>
                {bulk.map((count) => (
                  <span key={count}>
                    {count}× {chaos(scarab.chaosValue * count)}c
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
