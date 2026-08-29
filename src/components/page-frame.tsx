import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The shape every page has under the sidebar: one column of content, and an
 * optional rail beside it for the numbers a page is read against rather than
 * read for.
 *
 * The rail only becomes a column at 1400px. The sidebar has already taken 17rem
 * of the window by then, so the usual 1280px would buy the rail its column out
 * of the content's. Below that it is an ordinary block, over or under the
 * content depending on which of the two you came for.
 */
export function PageFrame({
  children,
  aside,
  asideFirst = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  /** Puts the rail over the content on a narrow window instead of under it. */
  asideFirst?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 min-[1400px]:flex-row min-[1400px]:items-start min-[1400px]:gap-8">
        <div className="min-w-0 flex-1">{children}</div>

        {aside && (
          <aside
            className={cn(
              // Sticky, so the numbers stay beside a table that is longer than
              // the window, and scrolling inside itself when the panel is the
              // long one, so its own bottom never becomes unreachable.
              "w-full shrink-0 min-[1400px]:sticky min-[1400px]:top-6 min-[1400px]:order-none min-[1400px]:max-h-[calc(100dvh-3rem)] min-[1400px]:w-72 min-[1400px]:overflow-y-auto",
              asideFirst && "order-first",
            )}
          >
            {aside}
          </aside>
        )}
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
