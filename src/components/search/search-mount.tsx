"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { League } from "@/lib/ninja";
import { openSearch, searchOpen, toggleSearch } from "./search-store";

/**
 * The palette itself is a chunk that arrives when asked for. Nobody pays for
 * cmdk and the index on a page they came to read, and a trigger fetches it on
 * hover or focus, so by the time it is opened it is usually already here.
 *
 * `ssr: false` has to be said in a client file, which is what this file is.
 */
const SearchPalette = dynamic(
  () => import("./search-palette").then((m) => m.SearchPalette),
  { ssr: false },
);

/** Whether a key press is being typed into something. */
function editable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Where the palette lives in the tree, and the shortcut that opens it.
 *
 * Rendered once in the layout, inside the sidebar's provider because a hit on
 * a phone has to close the sheet it was opened from. The palette mounts on the
 * first opening and stays mounted after, so the second opening is instant;
 * what it shows is reset by the dialog itself, which unmounts its content
 * when it closes.
 *
 * The shortcut lives here rather than in the palette so it works before the
 * chunk has arrived. Cmd or Ctrl with K, the way every palette is opened, and
 * a bare slash from anywhere that is not a field, the way a search is.
 */
export function SearchMount({
  leagues,
  fallback,
}: {
  leagues: League[];
  /** The league the links fall back to, for a page that carries none. */
  fallback: string;
}) {
  const open = useSyncExternalStore(
    searchOpen.subscribe,
    searchOpen.read,
    searchOpen.server,
  );
  const [seen, setSeen] = useState(false);
  if (open && !seen) setSeen(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && !event.altKey && !event.shiftKey && event.key === "k") {
        event.preventDefault();
        toggleSearch();
        return;
      }
      if (
        event.key === "/" &&
        !modifier &&
        !event.altKey &&
        !editable(event.target)
      ) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!seen) return null;
  return <SearchPalette open={open} leagues={leagues} fallback={fallback} />;
}
