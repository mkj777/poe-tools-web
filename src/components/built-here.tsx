import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The tag a page of this site wears beside its name, in the sidebar and on
 * its card. The pages sit among the tools they belong with rather than under
 * a heading of their own, so this is the one thing that says which of the
 * column is ours.
 */
export function BuiltHere({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-muted-foreground h-4 shrink-0 px-1.5 text-[10px] font-medium",
        className,
      )}
    >
      Built here
    </Badge>
  );
}
