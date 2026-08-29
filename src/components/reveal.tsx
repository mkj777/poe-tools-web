"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * A block that arrives rather than appears: 8px up and out of nothing, once,
 * on mount. Used where a page is read top to bottom and that order is worth
 * showing, never on anything you have to wait for before you can act.
 *
 * A reader who has asked their system for less motion gets none of it.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  /** Seconds. The steps of a list come in one after the other. */
  delay?: number;
  className?: string;
  /** The element to be, so a list item stays a child of its list. */
  as?: "div" | "li";
}) {
  const still = useReducedMotion();

  if (still) {
    return as === "li" ? (
      <li className={className}>{children}</li>
    ) : (
      <div className={className}>{children}</div>
    );
  }

  const Tag = as === "li" ? motion.li : motion.div;

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
