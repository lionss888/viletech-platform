import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readRefsOpen, REFS_OPEN_KEY, writeRefsOpen } from "./nav-refs-open";

/** Minimal localStorage double: vitest runs in the node environment. */
function createStorageStub(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("nav refs group persistence", () => {
  beforeEach(() => {
    Reflect.set(globalThis, "window", { localStorage: createStorageStub() });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("uses the route-derived fallback when nothing is stored", () => {
    expect(readRefsOpen(true)).toBe(true);
    expect(readRefsOpen(false)).toBe(false);
  });

  it("prefers the stored value over the fallback", () => {
    writeRefsOpen(true);
    expect(readRefsOpen(false)).toBe(true);
    writeRefsOpen(false);
    expect(readRefsOpen(true)).toBe(false);
  });

  it("stores the flag as 1/0 under a stable key", () => {
    writeRefsOpen(true);
    expect(window.localStorage.getItem(REFS_OPEN_KEY)).toBe("1");
    writeRefsOpen(false);
    expect(window.localStorage.getItem(REFS_OPEN_KEY)).toBe("0");
  });

  it("keeps the fallback when window is unavailable (SSR)", () => {
    Reflect.deleteProperty(globalThis, "window");
    expect(readRefsOpen(true)).toBe(true);
    expect(() => writeRefsOpen(true)).not.toThrow();
  });
});
