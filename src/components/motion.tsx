"use client";

import { div, li, section, span } from "motion/react-m";

/**
 * The `m` elements the site uses, named, so a server component can render
 * one: `m.li` is a property on a proxy and no client reference, `MotionLi`
 * is. Only plain props may cross over (`whileHover`, `transition`), which is
 * all the cards on the home page need.
 */
export const MotionDiv = div;
export const MotionLi = li;
export const MotionSection = section;
export const MotionSpan = span;
