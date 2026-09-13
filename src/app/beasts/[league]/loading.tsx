import { PageFrame } from "@/components/page-frame";
import {
  PriceCardsSkeleton,
  TableSkeleton,
} from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { BeastsHeader } from "./header";

/**
 * The beast page before its prices: the heading as it will stay, and the
 * shape of the controls and the table under it. This is what a click on the
 * sidebar entry shows at once, since the page itself is rendered per visit
 * and cannot be fetched ahead.
 */
export default function Loading() {
  return (
    <PageFrame
      asideFirst
      header={<BeastsHeader />}
      aside={<PriceCardsSkeleton />}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-64 rounded-full" />
          <Skeleton className="h-9 w-32 max-w-xs min-w-32 flex-1" />
          <Skeleton className="ml-auto h-5 w-28" />
        </div>
        <TableSkeleton rows={10} />
      </div>
    </PageFrame>
  );
}
