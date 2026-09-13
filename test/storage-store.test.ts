import assert from "node:assert/strict";
import test from "node:test";
import { createStorageStore } from "../src/lib/storage-store.ts";

/** A storage that counts how often it is asked, and can refuse. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const calls = { get: 0, set: 0 };
  let refuse = false;
  return {
    calls,
    refuse: () => {
      refuse = true;
    },
    getItem(key: string) {
      calls.get++;
      if (refuse) throw new Error("no storage");
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      calls.set++;
      if (refuse) throw new Error("no storage");
      data.set(key, value);
    },
    data,
  };
}

test("the server snapshot is the fallback and never touches storage", () => {
  const storage = fakeStorage({ k: '"trash"' });
  const store = createStorageStore("k", JSON.parse, "sell", JSON.stringify, () => storage);
  assert.equal(store.server(), "sell");
  assert.equal(storage.calls.get, 0);
});

test("read asks storage once and hands back the same value after that", () => {
  const storage = fakeStorage({ k: JSON.stringify({ counts: { a: "2" } }) });
  const store = createStorageStore<{ counts: Record<string, string> }>(
    "k",
    JSON.parse,
    { counts: {} },
    JSON.stringify,
    () => storage,
  );
  const first = store.read();
  assert.deepEqual(first, { counts: { a: "2" } });
  assert.equal(store.read(), first, "the same object, or React re-renders forever");
  assert.equal(store.read(), first);
  assert.equal(storage.calls.get, 1);
});

test("a missing or unusable value reads as the fallback", () => {
  const empty = createStorageStore("k", JSON.parse, "sell", JSON.stringify, () => fakeStorage());
  assert.equal(empty.read(), "sell");

  const broken = createStorageStore("k", JSON.parse, "sell", JSON.stringify, () => fakeStorage({ k: "{not json" }));
  assert.equal(broken.read(), "sell");

  const refusing = fakeStorage();
  refusing.refuse();
  const refused = createStorageStore("k", JSON.parse, "sell", JSON.stringify, () => refusing);
  assert.equal(refused.read(), "sell");
});

test("write stores, updates the cached value and tells every listener once", () => {
  const storage = fakeStorage();
  const store = createStorageStore("mode", String, "sell", String, () => storage);
  const heard: string[] = [];
  const stopA = store.subscribe(() => heard.push("a"));
  store.subscribe(() => heard.push("b"));

  store.write("trash");
  assert.equal(store.read(), "trash");
  assert.equal(storage.data.get("mode"), "trash");
  assert.deepEqual(heard, ["a", "b"]);

  stopA();
  store.write("sell");
  assert.deepEqual(heard, ["a", "b", "b"]);
});

test("a write that storage refuses still holds for the visit", () => {
  const storage = fakeStorage();
  storage.refuse();
  const store = createStorageStore("mode", String, "sell", String, () => storage);
  store.write("trash");
  assert.equal(store.read(), "trash");
});
