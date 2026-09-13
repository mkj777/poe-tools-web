import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A block that arrives rather than appears: 8px up and out of nothing, once,
 * as the page paints. Used where a page is read top to bottom and that order
 * is worth showing, never on anything you have to wait for before you can act.
 *
 * It is a CSS animation, not a scripted one, for two reasons that turned out
 * to be the same reason. The block is on screen with the HTML instead of after
 * the script that would have animated it, so a slow connection reads the page
 * before the JavaScript lands. And a reader who has asked their system for
 * less motion gets the block with no animation at all, through the media query
 * rather than through a branch in the component: the server and the browser
 * render the same markup, so there is nothing for hydration to disagree about.
 * The scripted version branched, and for those readers the server's
 * `opacity: 0` was never replaced, which left the home page blank.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Seconds. The steps of a list come in one after the other. */
  delay?: number;
  className?: string;
  /** The element to be, so a list item stays a child of its list. */
  as?: "div" | "li";
}) {
  return (
    <Tag
      className={cn(
        // The shape of the entrance is set unconditionally; only `animate-in`
        // is behind the motion query, and without it these are inert.
        "fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:animate-in",
        className,
      )}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
