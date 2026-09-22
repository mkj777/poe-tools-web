import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The glyph on a copy button, and the one moment that button has anything to
 * say. The tick does not replace the sheets, it takes over from them, which is
 * the difference between a button that answered and a button that redrew.
 *
 * Both glyphs are always in the markup, stacked, and the one that is not
 * current is faded out and shrunk. That is what lets it be a CSS transition
 * rather than a scripted one: the server and the browser agree on the markup
 * whatever the reader's motion setting, and the setting is honoured by the
 * media query, not by a branch that hydration would have to be told about.
 */
export function CopyGlyph({ copied }: { copied: boolean }) {
  const glyph = (on: boolean) =>
    cn(
      "absolute inset-0 size-4 transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none",
      on ? "scale-100 opacity-100" : "scale-50 opacity-0",
    );

  return (
    <span className="relative grid size-4 shrink-0 place-items-center">
      <Copy className={glyph(!copied)} />
      <Check className={glyph(copied)} />
    </span>
  );
}
