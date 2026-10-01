/** Currency option for rate/commission selects. */
export type RateCurrencyOption = {
  readonly code: string;
  readonly title: string;
};

/**
 * Builds select options from the currency catalog.
 * Keeps the currently selected code even if it is missing from the catalog.
 */
export function currencyOptionsForSelect(
  currencies: readonly RateCurrencyOption[],
  selectedCode: string,
): RateCurrencyOption[] {
  const selected = selectedCode.trim().toUpperCase();
  const seen = new Set<string>();
  const options: RateCurrencyOption[] = [];
  for (const item of currencies) {
    const code = item.code.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    options.push({ code, title: item.title || code });
  }
  if (selected && !seen.has(selected)) {
    options.unshift({ code: selected, title: selected });
  }
  return options;
}

/** Edit form is shown only when the manager opened «Редактировать». */
export function isRateCommissionFormVisible(canEdit: boolean, isEditing: boolean): boolean {
  return canEdit && isEditing;
}
