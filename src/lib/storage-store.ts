/**
 * A value that lives in localStorage, shaped for `useSyncExternalStore`.
 *
 * The server has no storage and renders `fallback`; the browser corrects it on
 * hydration, and neither reads storage during a render. `read` hands back the
 * same value until `write` changes it: React calls it on every render and
 * treats a fresh object as a change, so a store that read storage each time
 * would either re-render forever or, for a primitive, pay a synchronous
 * storage read per render for nothing. The beast table's mode and the map
 * page's setup each had a copy of this; one of the two cached, one did not.
 */
export type StorageStore<T> = {
  /** The current value, cached after the first read. */
  read: () => T;
  /** For the server, and for a browser that has not read storage yet. */
  server: () => T;
  write: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStorageStore<T>(
  key: string,
  /** Turns what was stored into a value, or throws for something unusable. */
  parse: (raw: string) => T,
  fallback: T,
  /** Turns a value into what is stored. `String` for a plain string value. */
  serialize: (value: T) => string = JSON.stringify,
  storage: () => Pick<Storage, "getItem" | "setItem"> = () => localStorage,
): StorageStore<T> {
  const listeners = new Set<() => void>();
  let cached: { value: T } | null = null;

  const load = (): T => {
    try {
      const raw = storage().getItem(key);
      return raw === null ? fallback : parse(raw);
    } catch {
      // A browser refusing storage, or a value from an older shape, costs the
      // saved value and nothing else.
      return fallback;
    }
  };

  return {
    read() {
      cached ??= { value: load() };
      return cached.value;
    },
    server: () => fallback,
    write(next) {
      cached = { value: next };
      try {
        storage().setItem(key, serialize(next));
      } catch {
        // Same as above: the value holds for this visit, and that is all.
      }
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
