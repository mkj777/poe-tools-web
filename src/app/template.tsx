"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { MotionDiv } from "@/components/motion";
import { featuresReady } from "@/components/motion-provider";
import { EASE } from "@/lib/motion";

/**
 * Whether a page has been on screen before. A module flag rather than state:
 * the template is remounted with a fresh key on every change of tool, and
 * what it has to know is only whether this is the first page of the visit.
 * No effect runs on the server, so there it stays false.
 */
let navigated = false;

/**
 * How a page arrives when you switch tools: 8px up and out of nothing, the
 * same shape as `Reveal`, once per tool rather than once per block. Next
 * keys this template by the first path segment, so a change of league on
 * the same tool leaves it standing, and so does the swap from a loading
 * skeleton to the page it stood for.
 *
 * The first page of a visit does not animate. It is on screen with the HTML,
 * before any script, and must not be hidden by one: with no `initial` there
 * is no `opacity: 0` in the server's markup, and the browser renders the
 * same thing. The home page is left out too, its sections already arrive
 * on their own. And a page asked for before the animation features have
 * loaded shows at once rather than waiting for them.
 */
export default function Template({ children }: { children: ReactNode }) {
  const home = usePathname() === "/";
  const enter = navigated && featuresReady() && !home;

  useEffect(() => {
    navigated = true;
  }, []);

  return (
    <MotionDiv
      initial={enter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {children}
    </MotionDiv>
  );
}
