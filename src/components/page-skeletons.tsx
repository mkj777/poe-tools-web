import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The shapes a page takes while its data is on the way. Each one is the size
 * of the thing it stands in for, so nothing moves when the page lands on top
 * of it; the sizes are taken from the components they mirror, and a change
 * there has to be made here as well.
 *
 * These are part of what the router prefetches for every page, so they are
 * kept to a few dozen elements: enough to say what is coming, not a copy of it.
 */

/** The league select's trigger, see league-select.tsx. */
export function LeagueSelectSkeleton() {
  return <Skeleton className="h-10 min-w-40 sm:h-9" />;
}

/** Text lines, each the width it is told, stacked as they would read. */
export function Lines({
  widths,
  className,
}: {
  /** Tailwind widths, one per line, in reading order. */
  widths: string[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {widths.map((w, i) => (
        <Skeleton key={i} className={cn("h-3.5", w)} />
      ))}
    </div>
  );
}

/**
 * The beast table: its header row and as many rows as are asked for, each
 * the height of a row with a name and a line under it.
 */
export function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex h-12 items-center gap-6 border-b px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ml-auto h-4 w-12" />
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-14" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="size-[26px] shrink-0 rounded-full" />
          <Lines widths={["w-40", "w-56"]} className="min-w-0 flex-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

/** The rail beside the beast table: mirror, divine, and the scarab total. */
export function PriceCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 rail:grid-cols-1">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "bg-card flex items-center gap-2.5 rounded-xl border px-3 py-2",
            i === 2 && "col-span-2 sm:col-span-1",
          )}
        >
          <Skeleton className="size-[26px] shrink-0 rounded-full" />
          <Lines widths={["w-16", "w-20"]} className="flex-1" />
        </div>
      ))}
    </div>
  );
}

/** The map page's setup card: a title row, a search field and the total. */
export function SetupSkeleton() {
  return (
    <div className="bg-card divide-y rounded-xl border">
      <div className="px-3 py-2">
        <Lines widths={["w-12", "w-32"]} />
      </div>
      <div className="px-3 py-2">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="px-3 py-2">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}
