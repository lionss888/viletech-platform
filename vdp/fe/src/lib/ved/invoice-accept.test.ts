import { describe, expect, it } from "vitest";

import { hasInvoiceDocument, INVOICE_REQUIRED_LOCK, isFormConfirmAction } from "./invoice-accept";

describe("invoice confirm lock", () => {
  it("locks only application confirm actions", () => {
    expect(isFormConfirmAction("eco_form_accept")).toBe(true);
    expect(isFormConfirmAction("eco_accept")).toBe(true);
    expect(isFormConfirmAction("manager_form_accept")).toBe(true);
    expect(isFormConfirmAction("mgr_order_accept")).toBe(false);
    expect(isFormConfirmAction("eco_form_reject")).toBe(false);
  });

  it("treats only kind invoice as the required file", () => {
    expect(hasInvoiceDocument([])).toBe(false);
    expect(hasInvoiceDocument([{ kind: "contract" }, { kind: "payment" }])).toBe(false);
    expect(hasInvoiceDocument([{ kind: "invoice" }])).toBe(true);
  });

  it("keeps the disabled-button reason", () => {
    expect(INVOICE_REQUIRED_LOCK).toBe("Нужен инвойс — без него заявку не подтвердить");
  });
});
