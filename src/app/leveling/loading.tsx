import { PageFrame } from "@/components/page-frame";
import { Lines } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelingHeader } from "./header";

/**
 * The leveling page is built once and fetched whole, so this only shows when
 * a click lands before that fetch has: the heading as it is, and the shape of
 * the screenshot and the three steps.
 */
export default function Loading() {
  return (
    <PageFrame>
      <div className="mx-auto max-w-5xl">
        <LevelingHeader />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <ol className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-start gap-3">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Lines widths={["w-full", "w-2/3"]} className="flex-1 pt-1" />
            </li>
          ))}
        </ol>
      </div>
    </PageFrame>
  );
}
