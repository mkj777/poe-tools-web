import type { ReactNode } from "react";
import { LeagueSelectSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/page-frame";

/** What the scarab page opens with, drawn by the page and its loading state. */
export function ScarabsHeader({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      title="Scarab Nodes"
      description="Economy of Scarab Nodes"
      actions={actions ?? <LeagueSelectSkeleton />}
    />
  );
}
