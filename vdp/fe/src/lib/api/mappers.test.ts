import { describe, expect, it } from "vitest";

import { mapCoreFormToPaymentForm, nextStepHint } from "./mappers";
import type { CoreForm } from "./forms";

function sample(overrides: Partial<CoreForm> = {}): CoreForm {
  return {
    id: "abcdef12-3456-7890-abcd-ef1234567890",
    account_id: "acc-1",
    organization_id: "org-1",
    status: "draft",
    direction: "import",
    kind: "good",
    invoice_amount: "1500.50",
    currency: "USD",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("mapCoreFormToPaymentForm", () => {
  it("maps amount with decimal to minor units", () => {
    const actual = mapCoreFormToPaymentForm(sample());
    expect(actual.amountMinor).toBe(150050);
    expect(actual.currency).toBe("USD");
  });

  it("maps status and short number from id", () => {
    const actual = mapCoreFormToPaymentForm(sample({ status: "payment_processing" }));
    expect(actual.status).toBe("payment_processing");
    expect(actual.number).toBe("ВЭД-abcdef12");
  });

  it("fills missing optional fields with placeholders", () => {
    const actual = mapCoreFormToPaymentForm(sample({ invoice_amount: "", currency: "" }), "Ivan");
    expect(actual.amountMinor).toBe(0);
    expect(actual.currency).toBe("USD");
    expect(actual.counterpartyId).toBe("—");
    expect(actual.ownerName).toBe("Ivan");
  });
});

describe("nextStepHint", () => {
  it("returns draft hint", () => {
    expect(nextStepHint("draft")).toContain("проверку");
  });
});
