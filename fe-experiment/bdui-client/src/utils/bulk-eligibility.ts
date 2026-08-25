import type { BduiBulkEligibility } from '../types/bdui';
import { readNestedValue } from './field-display';

function normalizeCompareValue(value: unknown): unknown {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return normalizeCompareValue(left) === normalizeCompareValue(right);
}

function isInSet(value: unknown, set: unknown[]): boolean {
  return set.some((item) => valuesMatch(value, item));
}

/**
 * Returns true when a list row matches bulk action eligibility rules.
 */
export function isRowEligibleForBulk(
  row: Record<string, unknown>,
  eligibility: BduiBulkEligibility | undefined,
): boolean {
  if (!eligibility) {
    return true;
  }
  const value = readNestedValue(row, eligibility.field);
  if (eligibility.in !== undefined && eligibility.in.length > 0) {
    return isInSet(value, eligibility.in);
  }
  if (eligibility.notIn !== undefined && eligibility.notIn.length > 0) {
    return !isInSet(value, eligibility.notIn);
  }
  return true;
}

export type BulkPartitionResult = {
  eligible: Record<string, unknown>[];
  ineligible: Record<string, unknown>[];
};

/**
 * Splits selected rows into eligible and ineligible for a bulk action.
 */
export function partitionBulkRows(
  rows: Record<string, unknown>[],
  selectedIds: string[],
  idField: string,
  eligibility: BduiBulkEligibility | undefined,
): BulkPartitionResult {
  const eligible: Record<string, unknown>[] = [];
  const ineligible: Record<string, unknown>[] = [];
  for (const row of rows) {
    const rowId = String(row[idField] ?? '');
    if (!selectedIds.includes(rowId)) {
      continue;
    }
    if (isRowEligibleForBulk(row, eligibility)) {
      eligible.push(row);
    } else {
      ineligible.push(row);
    }
  }
  return { eligible, ineligible };
}
