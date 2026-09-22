"use client";

import { Check, Copy } from "lucide-react";
import { MotionSpan } from "@/components/motion";

/** Quick and firm: the tick pops in, it does not drift. */
const POP = { type: "spring", stiffness: 500, damping: 30 } as const;

/**
 * The glyph on a copy button, and the one moment that button has anything to
 * say. The tick does not replace the sheets, it takes over from them, which is
 * the difference between a button that answered and a button that redrew.
 *
 * Both glyphs are always in the markup, stacked, and the one that is not
 * current is faded out and shrunk. The server renders the button before any
 * copy, so it renders both the same way the browser does on its first pass;
 * with no `initial` state there is nothing for hydration to disagree about,
 * and the reader's motion setting is honoured by the motion config, not by a
 * branch in the markup.
 */
export function CopyGlyph({ copied }: { copied: boolean }) {
  const glyph = (on: boolean) => ({
    initial: false as const,
    animate: { scale: on ? 1 : 0.5, opacity: on ? 1 : 0 },
    transition: POP,
    className: "absolute inset-0 size-4",
  });

  return (
    <span className="relative grid size-4 shrink-0 place-items-center">
      <MotionSpan {...glyph(!copied)}>
        <Copy className="size-4" />
      </MotionSpan>
      <MotionSpan {...glyph(copied)}>
        <Check className="size-4" />
      </MotionSpan>
    </span>
  );
}

/**
 * The word beside the glyph, "Copy" until it has, then "Copied" for a
 * moment. Both words are in the markup, one over the other, so the button
 * keeps the width of the longer and nothing beside it shifts; the current
 * one is the one you can see, the other is hidden from readers as well.
 */
export function CopyLabel({ copied }: { copied: boolean }) {
  const word = (on: boolean, from: number) => ({
    initial: false as const,
    animate: { opacity: on ? 1 : 0, y: on ? 0 : from },
    transition: POP,
    "aria-hidden": !on || undefined,
    className: "[grid-area:1/1]",
  });

  return (
    <span className="grid text-center">
      <MotionSpan {...word(!copied, -4)}>Copy</MotionSpan>
      <MotionSpan {...word(copied, 4)}>Copied</MotionSpan>
    </span>
  );
}
