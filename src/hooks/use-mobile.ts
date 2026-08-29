import * as React from "react";

const MOBILE_BREAKPOINT = 1024;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the window is narrow enough that the sidebar has to be a sheet.
 *
 * 1024 rather than the 768 shadcn ships: a permanent 17rem panel on a tablet
 * takes a third of the window from a page that needs the width. It has to stay
 * in step with the `lg:` classes in `components/ui/sidebar.tsx`, or there is a
 * width where the navigation is in neither place.
 *
 * Read from the media query itself rather than mirrored into state in an
 * effect: the server has no window, so it answers false and the first client
 * render corrects it, which is the same order the sidebar was written for.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
