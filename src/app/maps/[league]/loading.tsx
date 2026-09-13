import { PageFrame } from "@/components/page-frame";
import { SetupSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { MapsHeader } from "./header";

/** A titled block of same-sized shapes, the way the map page is laid out. */
function Block({
  title,
  count,
  grid,
  height,
}: {
  title: string;
  count: number;
  grid: string;
  height: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className={`grid grid-cols-1 gap-2 ${grid}`}>
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className={height} />
        ))}
      </div>
    </div>
  );
}

/**
 * The map page before its prices. The regex needs nothing from the network,
 * so the wait is short; this keeps the page's shape for the moment it takes.
 */
export default function Loading() {
  return (
    <PageFrame header={<MapsHeader />} aside={<SetupSkeleton />}>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="min-h-10 flex-1" />
            <Skeleton className="size-10 shrink-0" />
          </div>
          <Skeleton className="my-2 h-5 w-48" />
        </div>
        <Block title="Minimums" count={3} grid="sm:grid-cols-3" height="h-9" />
        <Block title="Presets" count={2} grid="sm:grid-cols-2" height="h-20" />
        <Block
          title="Banned"
          count={3}
          grid="sm:grid-cols-2 lg:grid-cols-3"
          height="h-9"
        />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
