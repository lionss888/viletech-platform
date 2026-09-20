/** Display helpers: empty catalog sentinels are not values. */

const BLANK_DISPLAY = new Set(["", "—", "–", "-", "−"]);

/** Real text, or undefined when the field is empty or a dash sentinel. */
export function presentValue(raw: string | undefined | null): string | undefined {
  const trimmed = (raw ?? "").trim();
  if (BLANK_DISPLAY.has(trimmed)) return undefined;
  return trimmed;
}

/** Organization address line. Never a bare dash. */
export function organizationAddressLine(legalAddress: string | undefined): string {
  return presentValue(legalAddress) ?? "Юридический адрес не указан";
}

/** INN line with a label. Never «ИНН —». */
export function innLine(inn: string | undefined): string {
  const value = presentValue(inn);
  return value ? `ИНН ${value}` : "ИНН не указан";
}

/** Country and bank joined. Drops empty parts so «Надеждия · —» becomes «Надеждия». */
export function counterpartyPlaceLine(country: string | undefined, bank: string | undefined): string | undefined {
  const parts = [presentValue(country), presentValue(bank)].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}

/** SWIFT line, or undefined when the code is missing. */
export function counterpartySwiftLine(swift: string | undefined): string | undefined {
  const value = presentValue(swift);
  return value ? `SWIFT ${value}` : undefined;
}

/** One sentence when bank and/or SWIFT are missing. */
export function counterpartyGapLine(bank: string | undefined, swift: string | undefined): string | undefined {
  const hasBank = Boolean(presentValue(bank));
  const hasSwift = Boolean(presentValue(swift));
  if (!hasBank && !hasSwift) return "Банк и SWIFT не указаны";
  if (!hasBank) return "Банк не указан";
  if (!hasSwift) return "SWIFT не указан";
  return undefined;
}

/**
 * Subject-review detail for a counterparty.
 * Known facts stay; a dash is never shown as a SWIFT code.
 */
export function counterpartySubjectDetail(
  country: string | undefined,
  bank: string | undefined,
  swift: string | undefined,
): string {
  const place = counterpartyPlaceLine(country, bank);
  const swiftLine = counterpartySwiftLine(swift);
  const gap = counterpartyGapLine(bank, swift);
  const parts = [place, swiftLine].filter((part): part is string => Boolean(part));
  if (gap && !swiftLine) parts.push(gap);
  if (parts.length === 0) return gap ?? "Банк и SWIFT не указаны";
  return parts.join(" · ");
}
