/**
 * Whether the palette is open, kept outside React so the three things that
 * open it (the field in the sidebar, the glyph in the mobile bar and the
 * shortcut on the window) share one answer without a provider threaded
 * through the layout for a boolean. Shaped like `StorageStore` so a component
 * reads it with `useSyncExternalStore` the same way; the server always says
 * closed, which is also what the first client render says.
 *
 * It also remembers what had focus when the palette opened, because the
 * dialog hands focus back to its own trigger on closing and this one has no
 * single trigger: the field, the glyph or the keyboard, whichever it was, is
 * where focus belongs afterwards.
 *
 * Nothing else lives here on purpose: the trigger in the sidebar imports this
 * on every page, and the search itself is a chunk that arrives when asked.
 */
const listeners = new Set<() => void>();
let open = false;
let opener: Element | null = null;

export const searchOpen = {
  read: () => open,
  server: () => false,
  /** What to focus once the palette closes. */
  opener: () => opener,
  set(next: boolean) {
    if (next === open) return;
    open = next;
    if (next) opener = document.activeElement;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const openSearch = () => searchOpen.set(true);
export const closeSearch = () => searchOpen.set(false);
export const toggleSearch = () => searchOpen.set(!open);

/**
 * Fetches the palette ahead of its first opening, from a hover or a focus on
 * anything that opens it. The same specifier as the lazy import in
 * search-mount.tsx, so the bundler hands back the same chunk.
 */
export function preloadSearch() {
  void import("./search-palette");
}
