import type { AttachedDocument, PaymentForm } from "./types";

export type FormDocumentRow = {
  doc: AttachedDocument;
  form: PaymentForm;
};

/**
 * Keeps agent reports whose form createdAt falls inside [fromDate, toDate] (inclusive calendar days).
 * Empty from/to → no rows (period is required before Show).
 */
export function filterAgentReportsByPeriod(
  rows: FormDocumentRow[],
  fromDate: string,
  toDate: string,
): FormDocumentRow[] {
  const from = fromDate.trim();
  const to = toDate.trim();
  if (!from || !to) return [];
  const fromMs = startOfDayMs(from);
  const toMs = endOfDayMs(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) return [];
  return rows.filter((row) => {
    if (row.doc.kind !== "report") return false;
    const created = Date.parse(row.form.createdAt);
    if (Number.isNaN(created)) return false;
    return created >= fromMs && created <= toMs;
  });
}

/** Collects already generated payment orders (mapped UI kind «order» from payment_order). */
export function listPaymentOrderRows(forms: PaymentForm[]): FormDocumentRow[] {
  return forms.flatMap((form) =>
    form.documents.filter((doc) => doc.kind === "order").map((doc) => ({ doc, form })),
  );
}

/** Collects agent report documents across forms (unfiltered by period). */
export function listAgentReportRows(forms: PaymentForm[]): FormDocumentRow[] {
  return forms.flatMap((form) =>
    form.documents.filter((doc) => doc.kind === "report").map((doc) => ({ doc, form })),
  );
}

function startOfDayMs(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.getTime();
}

function endOfDayMs(isoDate: string): number {
  const d = new Date(`${isoDate}T23:59:59.999`);
  return d.getTime();
}
