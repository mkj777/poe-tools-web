import { cn } from "@/lib/utils";

/**
 * The mark: a socket with a jewel in it, drawn in the same language as the
 * lucide icons it sits above — 24 unit box, 1.75 stroke, round joins — so the
 * sidebar reads as one set rather than as a logo with icons under it.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <path d="M12 2.6 21.4 12 12 21.4 2.6 12Z" />
      <path d="M12 8.2 15.8 12 12 15.8 8.2 12Z" fill="currentColor" />
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
