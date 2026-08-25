import type { BduiColumn, BduiColumnFormat } from '../types/bdui';

/**
 * Reads a possibly nested field from a form-payment (or list row) payload.
 */
export function readNestedValue(data: Record<string, unknown>, key: string): unknown {
  if (key.includes('.')) {
    return key.split('.').reduce<unknown>((current, part) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, data);
  }
  return data[key];
}

/**
 * Resolves display value with domain fallbacks (amount lives under totals).
 */
export function resolveFieldValue(data: Record<string, unknown>, key: string): unknown {
  let value = readNestedValue(data, key);
  if ((value === null || value === undefined) && key === 'totals.amount') {
    value = data.amount;
  }
  if ((value === null || value === undefined) && key === 'currency.client') {
    const currency = data.currency;
    if (currency && typeof currency === 'object') {
      value = (currency as Record<string, unknown>).client;
    }
    if (value === null || value === undefined) {
      value = data.currencyClient;
    }
  }
  if ((value === null || value === undefined) && key === 'currency.counterparty') {
    const currency = data.currency;
    if (currency && typeof currency === 'object') {
      value = (currency as Record<string, unknown>).counterparty;
    }
    if (value === null || value === undefined) {
      value = data.currencyCounterparty;
    }
  }
  return value;
}

function formatMoneyMinor(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  return (numeric / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a cell/detail value for BDUI tables and detail fields.
 */
export function formatFieldDisplay(
  data: Record<string, unknown>,
  column: Pick<BduiColumn, 'key' | 'format'>,
): string {
  const value = resolveFieldValue(data, column.key);
  if (value === null || value === undefined) {
    return '—';
  }
  const format: BduiColumnFormat = column.format ?? 'plain';
  if (format === 'money_minor') {
    return formatMoneyMinor(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
