import { describe, expect, it } from "vitest";
import { extractionPanelMode, isLowConfidence, parseExtractionResult } from "./extraction";

describe("parseExtractionResult", () => {
  it("parses schema v1 invoice_json", () => {
    const raw = JSON.stringify({
      schema_version: "v1",
      header: { invoice_amount: "1000", currency: "USD" },
      line_items: [{ line_no: 1, description: "Goods", confidence: 0.4 }],
      meta: { engine_id: "fixture" },
    });
    const got = parseExtractionResult(raw);
    expect(got?.header.currency).toBe("USD");
    expect(got?.line_items).toHaveLength(1);
    expect(isLowConfidence(got!.line_items[0]!)).toBe(true);
  });

  it("returns null for unrelated json", () => {
    expect(parseExtractionResult('{"foo":1}')).toBeNull();
  });
});

describe("extractionPanelMode", () => {
  it("hides empty OCR block after creating / without documents", () => {
    expect(
      extractionPanelMode({ role: "user", hasDraft: false, status: "form_verification" }),
    ).toBe("hide");
    expect(
      extractionPanelMode({ role: "user", hasDraft: false, status: "creating", noDocuments: true }),
    ).toBe("hide");
  });

  it("shows pending only while creating with expected documents", () => {
    expect(extractionPanelMode({ role: "user", hasDraft: false, status: "creating" })).toBe(
      "pending",
    );
  });

  it("shows review when extraction payload exists", () => {
    expect(
      extractionPanelMode({ role: "manager", hasDraft: true, status: "form_verification" }),
    ).toBe("review");
  });
});
