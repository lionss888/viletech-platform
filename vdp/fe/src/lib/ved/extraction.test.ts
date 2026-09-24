import { describe, expect, it } from "vitest";
import {
  canControlExtraction,
  extractionDialogTitle,
  extractionPanelMode,
  extractionShellVariant,
  extractionTriggerLabel,
  hasPrefillableExtraction,
  isDegradedExtraction,
  isExtractionDraft,
  isLowConfidence,
  isOcrAuthLostError,
  layoutTextFromWarnings,
  ocrBannerFromExtraction,
  ocrPollTimedOut,
  OCR_POLL_TIMEOUT_MS,
  parseExtractionResult,
  shortExtractionWarnings,
} from "./extraction";

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
    expect(isExtractionDraft(raw)).toBe(true);
  });

  it("returns null for form dump json without schema or engine", () => {
    const dump = JSON.stringify({
      id: "f1",
      account_id: "a1",
      status: "creating",
      invoice_amount: "0",
      currency: "CNY",
    });
    expect(parseExtractionResult(dump)).toBeNull();
    expect(isExtractionDraft(dump)).toBe(false);
  });

  it("returns null for unrelated json", () => {
    expect(parseExtractionResult('{"foo":1}')).toBeNull();
  });

  it("accepts engine_id without schema_version for nested extraction wrap", () => {
    const raw = JSON.stringify({
      extraction: {
        header: { invoice_amount: "10" },
        line_items: [],
        meta: { engine_id: "docling" },
      },
    });
    expect(parseExtractionResult(raw)?.meta.engine_id).toBe("docling");
  });
});

describe("ocrPollTimedOut", () => {
  it("uses 165s default budget above hub 120s", () => {
    expect(OCR_POLL_TIMEOUT_MS).toBe(225_000);
    expect(ocrPollTimedOut(0)).toBe(false);
    expect(ocrPollTimedOut(OCR_POLL_TIMEOUT_MS - 1)).toBe(false);
    expect(ocrPollTimedOut(OCR_POLL_TIMEOUT_MS)).toBe(true);
    expect(ocrPollTimedOut(50, 40)).toBe(true);
  });
});

describe("isDegradedExtraction", () => {
  it("marks fixture and unavailable engines as degraded", () => {
    expect(
      isDegradedExtraction({
        schema_version: "v1",
        header: {},
        line_items: [],
        meta: { engine_id: "fixture" },
        warnings: ["fixture_mode", "degraded"],
      }),
    ).toBe(true);
    expect(
      isDegradedExtraction({
        schema_version: "v1",
        header: {},
        line_items: [],
        meta: { engine_id: "unavailable" },
      }),
    ).toBe(true);
    expect(
      ocrBannerFromExtraction({
        schema_version: "v1",
        header: { invoice_amount: "1" },
        line_items: [],
        meta: { engine_id: "docling" },
        confidence: 0.9,
      }),
    ).toBe("done");
  });

  it("treats empty header and low confidence as degraded banner", () => {
    expect(
      ocrBannerFromExtraction({
        schema_version: "v1",
        header: {},
        line_items: [],
        meta: { engine_id: "docling" },
        confidence: 0.9,
      }),
    ).toBe("degraded");
    expect(
      ocrBannerFromExtraction({
        schema_version: "v1",
        header: { invoice_amount: "1500", currency: "USD" },
        line_items: [],
        meta: { engine_id: "docling" },
        confidence: 0.35,
      }),
    ).toBe("degraded");
    expect(
      ocrBannerFromExtraction({
        schema_version: "v1",
        header: {},
        line_items: [],
        meta: { engine_id: "timeout" },
        warnings: ["degraded", "ocr_timeout"],
      }),
    ).toBe("degraded");
  });
});

describe("hasPrefillableExtraction", () => {
  it("detects header and line fallbacks", () => {
    expect(
      hasPrefillableExtraction({
        schema_version: "v1",
        header: { invoice_amount: "10" },
        line_items: [],
        meta: {},
      }),
    ).toBe(true);
    expect(
      hasPrefillableExtraction({
        schema_version: "v1",
        header: {},
        line_items: [{ line_amount: "5", currency: "EUR" }],
        meta: {},
      }),
    ).toBe(true);
    expect(
      hasPrefillableExtraction({
        schema_version: "v1",
        header: {},
        line_items: [],
        meta: {},
      }),
    ).toBe(false);
  });
});

describe("isOcrAuthLostError", () => {
  it("detects 401 status", () => {
    expect(isOcrAuthLostError({ status: 401 })).toBe(true);
    expect(isOcrAuthLostError({ status: 500 })).toBe(false);
    expect(isOcrAuthLostError(null)).toBe(false);
  });
});
describe("extractionPanelMode", () => {
  it("hides OCR without documents on late statuses", () => {
    expect(
      extractionPanelMode({ role: "user", hasDraft: false, status: "form_verification" }),
    ).toBe("hide");
  });

  it("shows idle with documents after submit including org-waiting", () => {
    expect(
      extractionPanelMode({
        role: "user",
        hasDraft: false,
        status: "organization_waiting_verification",
        hasDocuments: true,
      }),
    ).toBe("idle");
    expect(
      extractionPanelMode({
        role: "user",
        hasDraft: false,
        status: "form_verification",
        hasDocuments: true,
      }),
    ).toBe("idle");
  });

  it("hides OCR panel when no_documents", () => {
    expect(
      extractionPanelMode({ role: "user", hasDraft: false, status: "creating", noDocuments: true }),
    ).toBe("hide");
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
    ).toBe("hide");
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
    expect(
      extractionPanelMode({
        role: "user",
        hasDraft: true,
        status: "organization_waiting_verification",
        hasDocuments: true,
      }),
    ).toBe("review");
  });

  it("hides on terminal statuses even with documents", () => {
    expect(
      extractionPanelMode({
        role: "user",
        hasDraft: false,
        status: "finished",
        hasDocuments: true,
      }),
    ).toBe("hide");
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

describe("extraction dialog copy", () => {
  it("maps trigger labels by mode", () => {
    expect(extractionTriggerLabel("idle")).toBe("Статус распознавания");
    expect(extractionTriggerLabel("pending")).toBe("Распознавание…");
    expect(extractionTriggerLabel("review")).toBe("Просмотр данных");
    expect(extractionTriggerLabel("hide")).toBe("");
  });

  it("maps dialog titles by mode", () => {
    expect(extractionDialogTitle("review")).toBe("Распознанные данные");
    expect(extractionDialogTitle("idle")).toBe("Распознавание");
    expect(extractionDialogTitle("pending")).toBe("Распознавание");
  });

  it("picks modal on desktop and sheet on mobile", () => {
    expect(extractionShellVariant(false)).toBe("modal");
    expect(extractionShellVariant(true)).toBe("sheet");
  });
});

describe("layout warnings helpers", () => {
  it("extracts layout dump and keeps short warnings separate", () => {
    const warnings = ["layout:RAW PAGE TEXT", "low confidence", "layout:PAGE 2"];
    expect(layoutTextFromWarnings(warnings)).toContain("RAW PAGE TEXT");
    expect(layoutTextFromWarnings(warnings)).toContain("PAGE 2");
    expect(shortExtractionWarnings(warnings)).toEqual(["low confidence"]);
  });
});
