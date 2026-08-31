import { describe, expect, it } from "vitest";

import { normalizeFormId, mapCoreFormToPaymentForm } from "./form-mapper";

describe("form-mapper", () => {
  it("normalizes hex id to dashed uuid", () => {
    const hex = "11111111111111111111111111111111";
    expect(normalizeFormId(hex)).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("maps core form status and amount", () => {
    const mapped = mapCoreFormToPaymentForm({
      id: "11111111-1111-1111-1111-111111111111",
      account_id: "a",
      status: "draft",
      direction: "import",
      kind: "good",
      invoice_amount: "100.50",
      currency: "USD",
      created_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-01T10:00:00Z",
    });
    expect(mapped.status).toBe("draft");
    expect(mapped.amountMinor).toBe(10050);
    expect(mapped.number).toContain("ВЭД-");
  });

  it("uses list projection names when present", () => {
    const mapped = mapCoreFormToPaymentForm({
      id: "22222222-2222-2222-2222-222222222222",
      account_id: "a",
      status: "creating",
      direction: "export",
      kind: "service",
      organization_name: "ООО Пример",
      number: "ВЭД-CUSTOM",
      created_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-01T10:00:00Z",
    });
    expect(mapped.ownerName).toBe("ООО Пример");
    expect(mapped.number).toBe("ВЭД-CUSTOM");
  });
});
