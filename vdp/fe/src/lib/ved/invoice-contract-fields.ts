/**
 * Keep invoice number in invoice_json.header, not in contract_number.
 * Contract number is a separate form field.
 */

export type InvoiceHeaderPatch = {
  header?: { invoice_number?: string; [key: string]: unknown };
  invoice_number?: string;
  [key: string]: unknown;
};

/** Merge a manual invoice number into existing invoice_json without wiping OCR header. */
export function mergeInvoiceNumberIntoJson(
  existingJson: string | undefined | null,
  invoiceNumber: string | undefined | null,
): string | undefined {
  const number = (invoiceNumber ?? "").trim();
  if (!number || number === "—") return undefined;
  let base: InvoiceHeaderPatch = {};
  if (existingJson?.trim()) {
    try {
      base = JSON.parse(existingJson) as InvoiceHeaderPatch;
    } catch {
      base = {};
    }
  }
  const header = { ...(base.header ?? {}), invoice_number: number };
  const next = { ...base, header, invoice_number: number };
  return JSON.stringify(next);
}

/**
 * Fields for create/patch: contract_number from contract only;
 * invoice lives in invoice_json when present.
 */
export function formContractAndInvoiceFields(input: {
  contractNumber?: string | null;
  invoiceNumber?: string | null;
  existingInvoiceJson?: string | null;
}): { contract_number?: string; invoice_json?: string } {
  const contract = (input.contractNumber ?? "").trim();
  const out: { contract_number?: string; invoice_json?: string } = {};
  if (contract && contract !== "—") {
    out.contract_number = contract;
  }
  const invoiceJson = mergeInvoiceNumberIntoJson(input.existingInvoiceJson, input.invoiceNumber);
  if (invoiceJson) {
    out.invoice_json = invoiceJson;
  }
  return out;
}
