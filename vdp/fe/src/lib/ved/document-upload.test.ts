import { describe, expect, it } from "vitest";

import {
  buildAttachedDocuments,
  detectDocumentKind,
  documentExt,
  documentSize,
  kindForCardUpload,
} from "./document-upload";

describe("documentExt", () => {
  it("maps known extensions to badge groups", () => {
    expect(documentExt("invoice.pdf")).toBe("PDF");
    expect(documentExt("scan.JPEG")).toBe("JPG");
    expect(documentExt("photo.png")).toBe("JPG");
    expect(documentExt("register.xls")).toBe("XLSX");
    expect(documentExt("table.csv")).toBe("XLSX");
    expect(documentExt("act.docx")).toBe("DOCX");
  });

  it("falls back to PDF for unknown or missing extension", () => {
    expect(documentExt("archive.zip")).toBe("PDF");
    expect(documentExt("no-extension")).toBe("PDF");
  });
});

describe("documentSize", () => {
  it("renders megabytes above the 1 MB threshold", () => {
    expect(documentSize(3 * 1024 * 1024)).toBe("3.0 МБ");
  });

  it("renders at least 1 KB for tiny files", () => {
    expect(documentSize(10)).toBe("1 КБ");
    expect(documentSize(2048)).toBe("2 КБ");
  });
});

describe("buildAttachedDocuments", () => {
  const at = "2026-08-31T12:00:00.000Z";

  it("builds one row per file with stable ids and stripped titles", () => {
    const actual = buildAttachedDocuments({
      formId: "form-1",
      files: [
        { name: "invoice-77.pdf", size: 1024 },
        { name: "shipment.xlsx", size: 2 * 1024 * 1024 },
      ],
      kind: "invoice",
      at,
      seed: 42,
    });
    expect(actual).toEqual([
      { id: "form-1-doc-42-0", title: "invoice-77", ext: "PDF", size: "1 КБ", uploadedAt: at, kind: "invoice" },
      { id: "form-1-doc-42-1", title: "shipment", ext: "XLSX", size: "2.0 МБ", uploadedAt: at, kind: "invoice" },
    ]);
  });

  it("returns an empty list when nothing was selected", () => {
    expect(buildAttachedDocuments({ formId: "form-1", files: [], kind: "other", at })).toEqual([]);
  });

  it("defaults a nameless file to invoice and keeps an explicit contract name", () => {
    expect(kindForCardUpload("scan.pdf")).toBe("invoice");
    expect(kindForCardUpload("договор-1.pdf")).toBe("contract");
    expect(kindForCardUpload("scan.pdf", "payment")).toBe("payment");
    const actual = buildAttachedDocuments({
      formId: "form-1",
      files: [{ name: "scan.pdf", size: 1024 }],
      at,
    });
    expect(actual[0]?.kind).toBe("invoice");
  });

  it("detects order before payment from filename", () => {
    expect(detectDocumentKind("signed-import-order.pdf")).toBe("order");
    expect(detectDocumentKind("payment-confirmation.pdf")).toBe("payment");
    expect(kindForCardUpload("поручение-принципал.pdf")).toBe("order");
  });
});
