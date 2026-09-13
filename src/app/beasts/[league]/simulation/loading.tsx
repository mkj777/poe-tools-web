import { PageFrame } from "@/components/page-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { SimulationHeader } from "./header";

/** The simulation before its beasts: the search field and a few tiles. */
export default function Loading() {
  return (
    <PageFrame header={<SimulationHeader />}>
      <div className="space-y-5">
        <div className="bg-card space-y-3 rounded-xl border p-5">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </PageFrame>
  );
}
