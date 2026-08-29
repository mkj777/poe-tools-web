import Image from "next/image";
import type { ToolIcon as Icon } from "@/lib/tools";
import { cn } from "@/lib/utils";

/** What the image optimiser can actually read. A favicon is not on the list. */
const OPTIMISED = /\.(png|jpe?g|webp|avif)$/i;

/**
 * The mark an entry wears, wherever an entry is drawn: the column of the
 * sidebar and the cards of the directory both.
 *
 * The label always names the entry beside it, so this is decoration and carries
 * no alt text. A square logo somebody else drew is rounded off; an item cut out
 * of the game has no corners to take.
 */
export function ToolIcon({
  icon,
  className,
}: {
  icon: Icon;
  className?: string;
}) {
  return (
    <Image
      src={icon.src}
      alt=""
      width={40}
      height={40}
      // The optimiser reads none of these, and an icon that is already the size
      // of an icon has nothing to gain from it.
      unoptimized={!OPTIMISED.test(icon.src)}
      className={cn(
        "size-5 shrink-0 object-contain",
        icon.rounded && "rounded",
        className,
      )}
    />
  );
}
