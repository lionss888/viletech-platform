/** Shared table sort helpers for registry and forms lists. */

export type SortDirection = "asc" | "desc";

/** True when column should default to newest-first. */
export function isDateSortKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "updatedat" ||
    k === "createdat" ||
    k.includes("updated") ||
    k.includes("created") ||
    k.endsWith("at") ||
    k.includes("date")
  );
}

/** Next direction when clicking a column header. */
export function nextSortDirection(
  currentKey: string,
  nextKey: string,
  currentDir: SortDirection,
): SortDirection {
  if (currentKey === nextKey) {
    return currentDir === "asc" ? "desc" : "asc";
  }
  return isDateSortKey(nextKey) ? "desc" : "asc";
}

function asComparable(value: unknown): string | number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value == null) return "";
  return String(value);
}

/** Compare two cell values for table sorting. */
export function compareSortValues(left: unknown, right: unknown, dir: SortDirection): number {
  const a = asComparable(left);
  const b = asComparable(right);
  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), "ru", { numeric: true, sensitivity: "base" });
  }
  return dir === "asc" ? cmp : -cmp;
}

/** Immutable sort of rows by getter. */
export function sortRowsBy<T>(
  rows: readonly T[],
  getValue: (row: T) => unknown,
  dir: SortDirection,
): T[] {
  return [...rows].sort((left, right) => compareSortValues(getValue(left), getValue(right), dir));
}
