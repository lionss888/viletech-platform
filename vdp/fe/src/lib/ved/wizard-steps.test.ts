import { describe, expect, it } from "vitest";

import {
  conditionToPaymentMethod,
  deriveInvoiceCurrency,
  documentsLabel,
  mergeExtractionPrefill,
  paymentMethodToCondition,
  WIZARD_STEPS,
  WIZARD_STEP,
} from "./wizard-steps";
import type { ExtractionResult } from "./extraction";

describe("wizard-steps", () => {
  it("orders documents first", () => {
    expect(WIZARD_STEPS[0]).toBe("Документы");
    expect(WIZARD_STEP.docs).toBe(0);
    expect(WIZARD_STEP.review).toBe(4);
  });

  it("maps payment condition round-trip", () => {
    expect(conditionToPaymentMethod("advance")).toBe("advance");
    expect(conditionToPaymentMethod("postPayment")).toBe("post_payment");
    expect(paymentMethodToCondition("advance")).toBe("advance");
    expect(paymentMethodToCondition("post_payment")).toBe("postPayment");
  });

  it("derives invoice currency from counterparty", () => {
    expect(deriveInvoiceCurrency("RUB", "CNY")).toBe("CNY");
    expect(deriveInvoiceCurrency("RUB", "")).toBe("RUB");
  });

  it("prefills from OCR without overwriting touched fields", () => {
    const extraction: ExtractionResult = {
      schema_version: "v1",
      header: {
        invoice_amount: "999",
        currency: "EUR",
        invoice_number: "INV-1",
        contract_number: "C-1",
        hs_codes: ["8471"],
      },
      line_items: [],
      meta: {},
    };
    const merged = mergeExtractionPrefill(
      { amount: "1", counterpartyCurrency: "CNY", invoiceNumber: "" },
      { amount: true },
      extraction,
    );
    expect(merged.amount).toBe("1");
    expect(merged.counterpartyCurrency).toBe("EUR");
    expect(merged.invoiceNumber).toBe("INV-1");
    expect(merged.contractNumber).toBe("C-1");
    expect(merged.hsCode).toBe("8471");
  });

  it("labels documents for invoice-only", () => {
    expect(documentsLabel(false, true, false)).toBe("Только инвойс");
    expect(documentsLabel(false, true, true)).toBe("Инвойс + контракт");
  });
});
