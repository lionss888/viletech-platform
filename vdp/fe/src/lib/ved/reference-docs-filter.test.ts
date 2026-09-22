import { describe, expect, it } from "vitest";

import {
  filterAgentReportsByPeriod,
  listAgentReportRows,
  listPaymentOrderRows,
  type FormDocumentRow,
} from "./reference-docs-filter";
import type { AttachedDocument, PaymentForm } from "./types";

function doc(partial: Partial<AttachedDocument> & Pick<AttachedDocument, "id" | "kind">): AttachedDocument {
  return {
    title: partial.title ?? partial.id,
    ext: "PDF",
    size: "1 KB",
    uploadedAt: partial.uploadedAt ?? "2026-03-01T12:00:00Z",
    ...partial,
  };
}

function form(partial: Partial<PaymentForm> & Pick<PaymentForm, "id" | "createdAt">): PaymentForm {
  return {
    number: partial.number ?? partial.id,
    status: "draft",
    direction: "import",
    kind: "good",
    condition: "advance",
    amountMinor: 100,
    currency: "USD",
    organizationId: "org-1",
    counterpartyId: "cp-1",
    hsCode: "1234",
    invoiceNumber: "INV-1",
    ownerName: "Owner",
    updatedAt: partial.createdAt,
    documents: [],
    timeline: [],
    ...partial,
  };
}

describe("filterAgentReportsByPeriod", () => {
  const rows: FormDocumentRow[] = [
    {
      doc: doc({ id: "r1", kind: "report", title: "Отчёт 1" }),
      form: form({ id: "f1", createdAt: "2026-03-10T10:00:00Z", documents: [] }),
    },
    {
      doc: doc({ id: "r2", kind: "report", title: "Отчёт 2" }),
      form: form({ id: "f2", createdAt: "2026-04-01T10:00:00Z", documents: [] }),
    },
    {
      doc: doc({ id: "inv", kind: "invoice", title: "Инвойс" }),
      form: form({ id: "f3", createdAt: "2026-03-15T10:00:00Z", documents: [] }),
    },
  ];

  it("returns empty when period is incomplete", () => {
    expect(filterAgentReportsByPeriod(rows, "", "2026-03-31")).toEqual([]);
    expect(filterAgentReportsByPeriod(rows, "2026-03-01", "")).toEqual([]);
  });

  it("keeps reports whose form date is inside the range", () => {
    const found = filterAgentReportsByPeriod(rows, "2026-03-01", "2026-03-31");
    expect(found.map((row) => row.doc.id)).toEqual(["r1"]);
  });

  it("excludes reports outside the dates", () => {
    const found = filterAgentReportsByPeriod(rows, "2026-05-01", "2026-05-31");
    expect(found).toEqual([]);
  });
});

describe("list document collectors", () => {
  it("lists report and order docs from forms", () => {
    const forms = [
      form({
        id: "f1",
        createdAt: "2026-03-01T00:00:00Z",
        documents: [
          doc({ id: "r", kind: "report" }),
          doc({ id: "o", kind: "order" }),
          doc({ id: "i", kind: "invoice" }),
        ],
      }),
    ];
    expect(listAgentReportRows(forms).map((r) => r.doc.id)).toEqual(["r"]);
    expect(listPaymentOrderRows(forms).map((r) => r.doc.id)).toEqual(["o"]);
  });
});
