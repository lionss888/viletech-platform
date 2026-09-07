/** Invoice/form currency option order for VED corridors. */

const PRIORITY_HEAD = ["RUB", "CNY"] as const;

/** Former USSR republics (excluding RUB — already in head). */
const FORMER_USSR = new Set([
  "AMD",
  "AZN",
  "BYN",
  "GEL",
  "KGS",
  "KZT",
  "MDL",
  "TJS",
  "TMT",
  "UAH",
  "UZS",
]);

/** Eastern Europe + Middle East (excludes codes already in head / USSR). */
const EAST_EUROPE_MIDDLE_EAST = new Set([
  "AED",
  "ALL",
  "BAM",
  "BGN",
  "BHD",
  "CZK",
  "EGP",
  "EUR",
  "HRK",
  "HUF",
  "ILS",
  "IQD",
  "IRR",
  "JOD",
  "KWD",
  "LBP",
  "MKD",
  "OMR",
  "PLN",
  "QAR",
  "RON",
  "RSD",
  "SAR",
  "SYP",
  "TRY",
  "YER",
]);

function currencyTier(code: string): number {
  const upper = code.toUpperCase();
  const headIndex = PRIORITY_HEAD.indexOf(upper as (typeof PRIORITY_HEAD)[number]);
  if (headIndex >= 0) {
    return headIndex;
  }
  if (FORMER_USSR.has(upper)) {
    return 10;
  }
  if (EAST_EUROPE_MIDDLE_EAST.has(upper)) {
    return 20;
  }
  return 30;
}

/**
 * Orders currency codes: RUB, CNY → former USSR → Eastern Europe & Middle East → rest of world.
 * Within a tier, sorts alphabetically.
 */
export function sortCurrencyCodes(codes: readonly string[]): string[] {
  return [...codes].sort((left, right) => {
    const leftCode = left.toUpperCase();
    const rightCode = right.toUpperCase();
    const tierDiff = currencyTier(leftCode) - currencyTier(rightCode);
    if (tierDiff !== 0) {
      return tierDiff;
    }
    return leftCode.localeCompare(rightCode);
  });
}

/**
 * Sorts currency records by corridor priority (code tiers).
 */
export function sortCurrencyRecords<T extends { code: string }>(records: readonly T[]): T[] {
  const order = sortCurrencyCodes(records.map((record) => record.code));
  const byCode = new Map(records.map((record) => [record.code.toUpperCase(), record]));
  return order
    .map((code) => byCode.get(code.toUpperCase()))
    .filter((record): record is T => record !== undefined);
}
