import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The shape every page has under the sidebar: one column of content, and an
 * optional rail beside it for the numbers a page is read against rather than
 * read for.
 *
 * The rail becomes a column at the `rail` breakpoint, 1440px, which is where
 * the content beside it still has room for a table of beast names. Below that
 * it is an ordinary block, over or under the content depending on which of the
 * two you came for, and always under the heading.
 */
export function PageFrame({
  children,
  header,
  aside,
  asideFirst = false,
}: {
  children: ReactNode;
  /**
   * The page's heading row. It sits above both columns rather than inside the
   * content, so that a rail which has had to become a block still lands under
   * the name of the page rather than over it.
   */
  header?: ReactNode;
  aside?: ReactNode;
  /** Puts the rail over the content on a narrow window instead of under it. */
  asideFirst?: boolean;
}) {
  // The rail goes into the HTML in the order it is seen, and the wide layout
  // is the one that reorders it with CSS, not the narrow one. A page streams:
  // the beast table is 200 rows of HTML, and a phone on a slow connection had
  // painted it before the rail's markup arrived, at which point the rail
  // landed over it and pushed the whole table down. In the order it is seen,
  // whatever has arrived is already where it will stay.
  const rail = aside && (
    <aside
      className={cn(
        // Sticky, so the numbers stay beside a table that is longer than the
        // window, and scrolling inside itself when the panel is the long one,
        // so its own bottom never becomes unreachable.
        "w-full shrink-0 rail:sticky rail:top-6 rail:max-h-[calc(100dvh-3rem)] rail:w-64 rail:overflow-y-auto",
        asideFirst && "rail:order-last",
      )}
    >
      {aside}
    </aside>
  );

  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 lg:px-8">
      {header}
      <div className="flex flex-col gap-6 rail:flex-row rail:items-start rail:gap-8">
        {asideFirst && rail}
        <div className="min-w-0 flex-1">{children}</div>
        {!asideFirst && rail}
      </div>
    </div>
  );
}

/**
 * What a page opens with: what it is on the left, and whatever it is set to on
 * the right. The league select is the usual right hand side, which is why it is
 * per page now: it belongs to the prices under it, not to the site.
 */
export function PageHeader({
  title,
  titleClassName,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  /** For a page whose heading is a sentence rather than a name. */
  titleClassName?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1
          className={cn(
            "text-2xl font-semibold tracking-tight text-balance",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
