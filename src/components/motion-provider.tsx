"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Whether the feature bundle has arrived. Until it has, an `m` element with
 * an `initial` state would sit in that state and wait; the one place that
 * animates a whole page (the template) asks first.
 */
let ready = false;

export function featuresReady() {
  return ready;
}

function loadFeatures() {
  return import("@/components/motion-features").then((mod) => {
    ready = true;
    return mod.default;
  });
}

/**
 * motion, once, around the app. The features come in their own chunk after
 * the page has painted, and `strict` throws on any `motion.*` element that
 * would drag the full bundle back in; every element on the site is an `m`.
 *
 * `reducedMotion="user"` honours the system setting the way the CSS does:
 * transforms and layout stop, opacity still fades. It is not a branch in
 * the markup, so the server and the browser keep rendering the same thing.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
