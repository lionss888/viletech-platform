import { describe, expect, it } from "vitest";

import { readinessChips } from "./form-readiness";
import type { PaymentForm } from "./types";

function baseForm(overrides: Partial<PaymentForm> = {}): PaymentForm {
  return {
    id: "form-1",
    number: "ВЭД-form-1",
    status: "signing_order_waiting_verification",
    direction: "import",
    kind: "good",
    condition: "advance",
    amountMinor: 10000,
    currency: "USD",
    organizationId: "org-1",
    counterpartyId: "cp-1",
    hsCode: "8471",
    invoiceNumber: "INV-1",
    ownerName: "Client",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    documents: [{ id: "d1", title: "inv", ext: "PDF", size: "1 КБ", uploadedAt: "2026-01-01T00:00:00.000Z", kind: "invoice" }],
    timeline: [],
    ...overrides,
  };
}

describe("readinessChips", () => {
  it("shows order queue chip on signing_order_waiting_verification", () => {
    const chips = readinessChips(baseForm(), "manager");
    expect(chips.some((c) => c.id === "take-order")).toBe(true);
    expect(chips.some((c) => c.id === "mine")).toBe(true);
  });

  it("shows treasurer chip on import advance payment_received", () => {
    const chips = readinessChips(
      baseForm({ status: "payment_received", documents: [] }),
      "user",
    );
    expect(chips.some((c) => c.id === "treasurer")).toBe(true);
  });

  it("flags missing invoice when not no-documents", () => {
    const chips = readinessChips(
      baseForm({ status: "form_waiting_verification", documents: [] }),
      "manager",
    );
    expect(chips.some((c) => c.id === "invoice")).toBe(true);
  });
});
