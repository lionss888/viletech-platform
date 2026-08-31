import { describe, expect, it } from "vitest";

import { mapComplianceHistory, mapCoreFormToPaymentForm, normalizeFormId, parseDocsJson } from "./mappers";
import type { CoreForm } from "./forms";

describe("normalizeFormId", () => {
  it("formats 32-char hex as dashed uuid", () => {
    expect(normalizeFormId("ca3dcfcddd3de79d19109c885e5f397b")).toBe(
      "ca3dcfcd-dd3d-e79d-1910-9c885e5f397b",
    );
  });

  it("keeps already dashed uuid", () => {
    expect(normalizeFormId("ca3dcfcd-dd3d-e79d-1910-9c885e5f397b")).toBe(
      "ca3dcfcd-dd3d-e79d-1910-9c885e5f397b",
    );
  });
});

describe("mapCoreFormToPaymentForm", () => {
  it("normalizes create-style hex id", () => {
    const form = {
      id: "ca3dcfcddd3de79d19109c885e5f397b",
      account_id: "a1",
      organization_id: "o1",
      status: "draft",
      direction: "import",
      kind: "good",
      invoice_amount: "10",
      currency: "USD",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as CoreForm;
    const mapped = mapCoreFormToPaymentForm(form, "User");
    expect(mapped.id).toBe("ca3dcfcd-dd3d-e79d-1910-9c885e5f397b");
  });
});

describe("parseDocsJson", () => {
  it("parses array docs_json", () => {
    const raw = JSON.stringify([{ id: "f1", kind: "invoice", label: "INV.pdf", mime: "application/pdf" }]);
    const docs = parseDocsJson(raw, "form-1");
    expect(docs).toHaveLength(1);
    expect(docs[0]?.title).toBe("INV.pdf");
    expect(docs[0]?.kind).toBe("invoice");
  });

  it("returns empty for invalid json", () => {
    expect(parseDocsJson("{bad", "x")).toEqual([]);
  });
});

describe("mapComplianceHistory", () => {
  it("maps history entries to timeline", () => {
    const timeline = mapComplianceHistory([
      {
        id: "h1",
        form_payment_id: "f1",
        actor_id: "a1",
        from_status: "draft",
        to_status: "form_waiting_verification",
        comment: "submit",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(timeline[0]?.title).toContain("submit");
  });
});
