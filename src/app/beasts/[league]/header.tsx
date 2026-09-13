import type { ReactNode } from "react";
import { LeagueSelectSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/page-frame";

/**
 * What the beast page opens with. The page and its loading state both draw
 * it, from here, so the heading is in place before the prices are and does
 * not move when they arrive. Without a league select to show, the loading
 * state leaves a shape its size.
 */
export function BeastsHeader({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      title="Beast Regex"
      description="Every beast on the market, and the Bestiary search for the ones worth catching."
      actions={actions ?? <LeagueSelectSkeleton />}
    />
  );
}
