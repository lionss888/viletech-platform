import { describe, expect, it } from "vitest";
import { isLowConfidence, parseExtractionResult } from "./extraction";

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
