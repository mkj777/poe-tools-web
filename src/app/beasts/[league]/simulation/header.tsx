import type { ReactNode } from "react";
import { LeagueSelectSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/page-frame";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What the simulation opens with. The description counts the beasts, which
 * the loading state cannot know yet, so it shows a line of that length.
 */
export function SimulationHeader({
  description,
  actions,
}: {
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <PageHeader
      title="Bestiary Sim"
      description={description ?? <Skeleton className="mt-1 h-3.5 w-80" />}
      actions={actions ?? <LeagueSelectSkeleton />}
    />
  );
}
