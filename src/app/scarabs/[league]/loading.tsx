import { PageFrame } from "@/components/page-frame";
import { Lines } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { ScarabsHeader } from "./header";

/** One node card's worth of space, see the Card in scarab-nodes.tsx. */
function CardSkeleton() {
  return (
    <li className="bg-card/40 border-border/60 flex flex-col rounded-xl border">
      <div className="flex items-start gap-3 p-3">
        <Skeleton className="mt-1.5 h-3.5 w-4 shrink-0" />
        <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />
        <Lines widths={["w-40", "w-56"]} className="min-w-0 flex-1 pt-1" />
        <Skeleton className="h-4 w-12 shrink-0" />
      </div>
      <div className="border-t px-3 py-2.5">
        <Lines widths={["w-full", "w-full", "w-3/4"]} />
      </div>
    </li>
  );
}

const SECTIONS: [string, number][] = [
  ["Turn content off", 6],
  ["Double drop chance", 5],
];

/**
 * The two lists before their prices: the headings as they will stay, and the
 * cards' shapes under them, fewer than the page will show.
 */
export default function Loading() {
  return (
    <PageFrame header={<ScarabsHeader />}>
      <div className="grid gap-10 xl:grid-cols-2 xl:gap-6">
        {SECTIONS.map(([title, count]) => (
          <section key={title}>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
              {Array.from({ length: count }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
