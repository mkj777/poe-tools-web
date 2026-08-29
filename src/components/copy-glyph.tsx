"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy } from "lucide-react";

/**
 * The glyph on a copy button, and the one moment that button has anything to
 * say. The tick does not replace the sheets, it takes over from them, which is
 * the difference between a button that answered and a button that redrew.
 */
export function CopyGlyph({ copied }: { copied: boolean }) {
  const still = useReducedMotion();
  const Glyph = copied ? Check : Copy;

  if (still) return <Glyph className="size-4" />;

  return (
    <span className="relative grid size-4 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={copied ? "copied" : "copy"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0 grid place-items-center"
        >
          <Glyph className="size-4" />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
