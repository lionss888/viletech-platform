export const INVOICE_REQUIRED_LOCK = "Нужен инвойс — без него заявку не подтвердить";

const FORM_CONFIRM_IDS = new Set(["eco_form_accept", "eco_accept", "manager_form_accept"]);

/** Confirm-application actions that require an invoice file. */
export function isFormConfirmAction(actionId: string): boolean {
  return FORM_CONFIRM_IDS.has(actionId);
}

/** True when the form already has a document of kind invoice. */
export function hasInvoiceDocument(documents: { kind?: string }[]): boolean {
  return documents.some((doc) => doc.kind === "invoice");
}
