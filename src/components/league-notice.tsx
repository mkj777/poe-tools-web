import { Info } from "lucide-react";

/**
 * A line over every page while the community catches up with 3.30, which
 * removed scarabs, the yellow beasts and Item Quantity on maps in one patch.
 * Temporary: delete it, and its one use in the root layout, once the tools
 * this site lists (and this site) have caught up.
 */
export function LeagueNotice() {
  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 pt-4 sm:px-6 lg:px-8">
      <p
        role="note"
        className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200"
      >
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-400" />
        <span>
          Due to the huge amount of changes 3.30 delivered, many sites are still
          updating their tools, as are we. Please mind this as the community
          catches up to all of these changes.
        </span>
      </p>
    </div>
  );
}
