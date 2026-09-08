import { describe, expect, it } from "vitest";
import { canControlExtraction, extractionPanelMode, isLowConfidence, parseExtractionResult } from "./extraction";

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
  it("hides OCR outside draft/creating/corrections", () => {
    expect(
      extractionPanelMode({ role: "user", hasDraft: false, status: "form_verification" }),
    ).toBe("hide");
  });

  it("shows pending while creating even when no_documents", () => {
    expect(
      extractionPanelMode({ role: "user", hasDraft: false, status: "creating", noDocuments: true }),
    ).toBe("pending");
    expect(extractionPanelMode({ role: "user", hasDraft: false, status: "creating" })).toBe(
      "pending",
    );
  });

  it("shows idle on draft and corrections so start/restart controls are available", () => {
    expect(extractionPanelMode({ role: "user", hasDraft: false, status: "draft" })).toBe("idle");
    expect(
      extractionPanelMode({
        role: "user",
        hasDraft: false,
        status: "draft",
        noDocuments: true,
      }),
    ).toBe("idle");
    expect(
      extractionPanelMode({
        role: "user",
        hasDraft: false,
        status: "form_waiting_corrections",
      }),
    ).toBe("idle");
  });

  it("shows review when extraction payload exists", () => {
    expect(
      extractionPanelMode({ role: "manager", hasDraft: true, status: "form_verification" }),
    ).toBe("review");
  });
});

describe("canControlExtraction", () => {
  it("allows user/manager/root on draft and corrections", () => {
    expect(canControlExtraction("user", "draft")).toBe(true);
    expect(canControlExtraction("manager", "form_waiting_corrections")).toBe(true);
    expect(canControlExtraction("provider", "draft")).toBe(false);
    expect(canControlExtraction("user", "form_accepted")).toBe(false);
  });
});
