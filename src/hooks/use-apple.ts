import * as React from "react";

const APPLE = /Mac|iPhone|iPad|iPod/;

const subscribe = () => () => {};

/**
 * Whether the shortcut key to name is Command rather than Control.
 *
 * Read the way `useIsMobile` reads its media query: the server has no
 * navigator and answers no, the first client render says the same, and the
 * one after hydration corrects it. Branching on the platform during render
 * would draw one glyph on the server and another in the browser, and React
 * would say so in the console on every Mac.
 */
export function useIsApple() {
  return React.useSyncExternalStore(
    subscribe,
    () => APPLE.test(navigator.platform),
    () => false,
  );
}
