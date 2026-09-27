import { describe, expect, it } from "vitest";

import { formContractAndInvoiceFields, mergeInvoiceNumberIntoJson } from "./invoice-contract-fields";

describe("invoice-contract-fields", () => {
  it("does not put invoice into contract_number", () => {
    const fields = formContractAndInvoiceFields({
      invoiceNumber: "INV-99",
      contractNumber: "C-1",
    });
    expect(fields.contract_number).toBe("C-1");
    expect(fields.invoice_json).toContain("INV-99");
    expect(JSON.parse(fields.invoice_json!).header.invoice_number).toBe("INV-99");
  });

  it("omits contract_number when only invoice is set", () => {
    const fields = formContractAndInvoiceFields({ invoiceNumber: "INV-ONLY" });
    expect(fields.contract_number).toBeUndefined();
    expect(fields.invoice_json).toBeDefined();
  });

  it("merges into existing OCR invoice_json", () => {
    const existing = JSON.stringify({
      schema_version: 1,
      header: { invoice_amount: "10", invoice_number: "OLD" },
    });
    const merged = mergeInvoiceNumberIntoJson(existing, "NEW-INV");
    const parsed = JSON.parse(merged!);
    expect(parsed.header.invoice_number).toBe("NEW-INV");
    expect(parsed.header.invoice_amount).toBe("10");
  });
});
