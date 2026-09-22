import type { Transition } from "motion/react";

/**
 * The shapes every scripted animation on the site shares, so a block that
 * arrives, a bar that travels and a count that rolls all move the same way.
 * Plain values in a plain module: a server component may read them, which a
 * `"use client"` module could not offer (its exports cross the boundary as
 * references, not as values).
 */

/** The one curve for anything timed: fast out, soft landing. `Reveal` in
    globals.css and the old sidebar transition used the same numbers. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** A short, firm spring for things that travel: the sidebar bar, the
    threshold highlight. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 45,
  mass: 0.6,
};

/** A softer spring for what answers the pointer. */
export const GESTURE_SPRING: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};
