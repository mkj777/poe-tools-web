import type { ReactNode } from "react";
import { LeagueSelectSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/page-frame";

/**
 * What the map page opens with, drawn by the page and its loading state. The
 * page is one field and the controls that fill it, so the heading says what
 * the field is for rather than naming the page again over the sidebar entry
 * that already names it.
 */
export function MapsHeader({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      title="Highlight all the Maps you want to run with this Regex"
      titleClassName="text-lg font-normal"
      actions={actions ?? <LeagueSelectSkeleton />}
    />
  );
}
