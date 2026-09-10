import { describe, expect, it } from "vitest";

import {
  compareSortValues,
  isDateSortKey,
  nextSortDirection,
  sortRowsBy,
} from "./table-sort";

describe("table-sort", () => {
  it("treats updatedAt as date key defaulting to desc", () => {
    expect(isDateSortKey("updatedAt")).toBe(true);
    expect(isDateSortKey("name")).toBe(false);
    expect(nextSortDirection("name", "updatedAt", "asc")).toBe("desc");
  });

  it("toggles direction on same column", () => {
    expect(nextSortDirection("updatedAt", "updatedAt", "desc")).toBe("asc");
  });

  it("sorts newest updatedAt first when desc", () => {
    const rows = [
      { id: "a", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "b", updatedAt: "2026-09-01T00:00:00Z" },
    ];
    const sorted = sortRowsBy(rows, (r) => r.updatedAt, "desc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("compareSortValues respects direction", () => {
    expect(compareSortValues("a", "b", "asc")).toBeLessThan(0);
    expect(compareSortValues("a", "b", "desc")).toBeGreaterThan(0);
  });
});
