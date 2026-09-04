import { describe, expect, it } from "vitest";

import { workTotalsByCurrency } from "./dashboard-totals";
import type { PaymentForm } from "./types";

function form(partial: Pick<PaymentForm, "id" | "status" | "amountMinor" | "currency">): PaymentForm {
  return {
    number: partial.id,
    direction: "import",
    kind: "good",
    condition: "advance",
    organizationId: "org-1",
    counterpartyId: "cp-1",
    hsCode: "0000",
    invoiceNumber: "INV",
    ownerName: "Owner",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    documents: [],
    timeline: [],
    ...partial,
  };
}

describe("workTotalsByCurrency", () => {
  it("groups active amounts by currency without mixing", () => {
    const input = [
      form({ id: "a", status: "draft", amountMinor: 100_00, currency: "CNY" }),
      form({ id: "b", status: "payment_waiting", amountMinor: 200_00, currency: "USD" }),
      form({ id: "c", status: "draft", amountMinor: 50_00, currency: "CNY" }),
      form({ id: "d", status: "completed", amountMinor: 999_00, currency: "TRY" }),
      form({ id: "e", status: "canceled_by_user", amountMinor: 10_00, currency: "USD" }),
    ];
    const actual = workTotalsByCurrency(input);
    expect(actual.active).toBe(3);
    expect(actual.byCurrency).toEqual([
      { currency: "USD", sumMinor: 200_00 },
      { currency: "CNY", sumMinor: 150_00 },
    ]);
  });

  it("sorts by sum descending then currency code", () => {
    const input = [
      form({ id: "a", status: "draft", amountMinor: 100_00, currency: "TRY" }),
      form({ id: "b", status: "draft", amountMinor: 100_00, currency: "USD" }),
      form({ id: "c", status: "draft", amountMinor: 300_00, currency: "CNY" }),
    ];
    expect(workTotalsByCurrency(input).byCurrency.map((r) => r.currency)).toEqual(["CNY", "TRY", "USD"]);
  });

  it("returns empty byCurrency when nothing is active", () => {
    const input = [form({ id: "a", status: "completed", amountMinor: 1, currency: "USD" })];
    expect(workTotalsByCurrency(input)).toEqual({ active: 0, byCurrency: [] });
  });
});
