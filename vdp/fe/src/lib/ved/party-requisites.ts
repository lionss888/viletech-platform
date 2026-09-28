/** Display helpers: empty catalog sentinels are not values. */

const BLANK_DISPLAY = new Set(["", "—", "–", "-", "−"]);

/** Canonical empty-field copy for card/registry cells (never a dash). */
export const UNSPECIFIED = "не указано";

/** Real text, or undefined when the field is empty or a dash sentinel. */
export function presentValue(raw: string | undefined | null): string | undefined {
  const trimmed = (raw ?? "").trim();
  if (BLANK_DISPLAY.has(trimmed)) return undefined;
  return trimmed;
}

/** Display text or «не указано» — never a bare dash. */
export function displayOrUnspecified(raw: string | undefined | null): string {
  return presentValue(raw) ?? UNSPECIFIED;
}

/**
 * Prefer catalog name; when id is set but catalog miss — selectedFallback (not UUID).
 * Empty / dash id → «не указано».
 */
export function catalogPartyLabel(
  catalogName: string | undefined | null,
  id: string | undefined | null,
  selectedFallback: string,
): string {
  const named = presentValue(catalogName);
  if (named) return named;
  if (presentValue(id)) return selectedFallback;
  return UNSPECIFIED;
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
