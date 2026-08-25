import type { BduiTableSortDirection } from '../types/bdui';

function readNestedValue(row: Record<string, unknown>, key: string): unknown {
  if (!key.includes('.')) {
    return row[key];
  }
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, row);
}

function normalizeSortValue(value: unknown): string | number {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return parsed;
    }
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
}

/**
 * Returns a new array sorted by nested row key (client-side queue ordering).
 */
export function sortTableRows(
  rows: Record<string, unknown>[],
  sortKey: string,
  direction: BduiTableSortDirection,
): Record<string, unknown>[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = normalizeSortValue(readNestedValue(left, sortKey));
    const rightValue = normalizeSortValue(readNestedValue(right, sortKey));
    if (leftValue === rightValue) {
      return 0;
    }
    if (leftValue < rightValue) {
      return -1 * factor;
    }
    return 1 * factor;
  });
}
