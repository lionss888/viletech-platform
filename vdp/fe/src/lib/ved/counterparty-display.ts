/** Display label for counterparty on lists/cards (F9: avoid false «не указан»). */

export type CounterpartyNamed = { id: string; name: string };

/**
 * Prefer catalog name; if id is set but catalog miss — «выбран», not «не указан».
 * Empty / placeholder id → «не указан».
 */
export function counterpartyListLabel(
  counterparties: readonly CounterpartyNamed[],
  counterpartyId: string | undefined | null,
): string {
  const id = (counterpartyId ?? "").trim();
  if (!id || id === "—") return "контрагент не указан";
  const named = counterparties.find((c) => c.id === id)?.name?.trim();
  if (named) return named;
  return "контрагент выбран";
}

/** True when reject mark/text is about documents (not parties). */
export function isDocsCorrection(mark?: string, text?: string): boolean {
  const blob = `${mark ?? ""} ${text ?? ""}`.toLowerCase();
  return /\bdocs?\b|документ|инвойс|invoice|файл|pdf|контракт.*docx?|договор.*файл/.test(blob);
}
