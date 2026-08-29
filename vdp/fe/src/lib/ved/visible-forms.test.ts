import { describe, expect, it } from "vitest";

import { visibleForms } from "./store";
import type { PaymentForm } from "./types";

function stubForm(partial: Partial<PaymentForm>): PaymentForm {
  return {
    id: partial.id ?? "f1",
    number: "VDP-1",
    status: partial.status ?? "draft",
    direction: "import",
    kind: "good",
    condition: "advance",
    amountMinor: 10000,
    currency: "USD",
    clientCurrency: "RUB",
    counterpartyCurrency: "USD",
    hsCode: "—",
    invoiceNumber: "INV",
    organizationId: "org",
    counterpartyId: "cp",
    ownerName: partial.ownerName ?? "Ivan Petrov",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documents: [],
    timeline: [],
    ...partial,
  };
}

describe("visibleForms", () => {
  it("user sees only forms matching session owner name", () => {
    const forms = [
      stubForm({ id: "a", ownerName: "Ivan Petrov" }),
      stubForm({ id: "b", ownerName: "Other" }),
    ];
    const actual = visibleForms(forms, "user", "Ivan Petrov");
    expect(actual.map((f) => f.id)).toEqual(["a"]);
  });

  it("user keeps ACL-listed forms with placeholder ownerName", () => {
    const forms = [stubForm({ id: "a", ownerName: "—" }), stubForm({ id: "b", ownerName: "Other" })];
    const actual = visibleForms(forms, "user", "Demo User");
    expect(actual.map((f) => f.id)).toEqual(["a"]);
  });

  it("user without session name sees full ACL list", () => {
    const forms = [stubForm({ id: "a" }), stubForm({ id: "b", ownerName: "Other" })];
    expect(visibleForms(forms, "user").map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("provider sees payment-stage forms only", () => {
    const forms = [
      stubForm({ id: "a", status: "payment_processing", ownerName: "X" }),
      stubForm({ id: "b", status: "draft", ownerName: "X" }),
    ];
    const actual = visibleForms(forms, "provider");
    expect(actual.map((f) => f.id)).toEqual(["a"]);
  });

  it("ECO sees form_* queue including waiting_verification and verification", () => {
    const forms = [
      stubForm({ id: "a", status: "form_waiting_verification" }),
      stubForm({ id: "b", status: "form_verification" }),
      stubForm({ id: "c", status: "organization_waiting_verification" }),
      stubForm({ id: "d", status: "form_accepted" }),
    ];
    const actual = visibleForms(forms, "compliance_officer");
    expect(actual.map((f) => f.id)).toEqual(["a", "b", "d"]);
  });
});
