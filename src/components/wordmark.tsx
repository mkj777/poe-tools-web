import { cn } from "@/lib/utils";

/**
 * The mark: a socket with a jewel in it, the very drawing that is the
 * favicon (`src/app/icon.svg`, without its tile), scaled from that 32 unit
 * box to the 24 of the icons it sits above. One picture in the tab and in
 * the bar, so the site is recognised by the same shape in both places. A
 * filled shape rather than a stroke, because that is what still reads at
 * 16px in a tab.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2.25 21.75 12 12 21.75 2.25 12Z M12 6.75 17.25 12 12 17.25 6.75 12Z"
      />
      <path fill="currentColor" d="M12 9.375 14.625 12 12 14.625 9.375 12Z" />
    </svg>
  );
}

/**
 * The name of the site, wherever it has to name itself. One line, set tight,
 * with the joining word stepped back so the two words that matter carry it.
 */
export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  /** For the collapsed sidebar, where the mark is the whole wordmark. */
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Mark className={cn("text-primary size-6", markClassName)} />
      <span className="truncate text-[0.95rem] leading-none font-semibold tracking-tight">
        Path <span className="text-muted-foreground font-normal">of</span> Tools
      </span>
    </span>
  );
}
