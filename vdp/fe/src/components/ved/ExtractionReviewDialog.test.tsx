import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExtractionReviewDialog } from "./ExtractionReviewDialog";
import { ExtractionReviewPanel } from "./ExtractionReviewPanel";
import {
  extractionDialogTitle,
  extractionShellVariant,
  extractionTriggerLabel,
} from "@/lib/ved/extraction";

function withQuery(children: ReactNode): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderToStaticMarkup(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

const sampleInvoiceJson = JSON.stringify({
  schema_version: "v1",
  header: {
    invoice_amount: "1000",
    currency: "USD",
    contract_number: "OCR-1",
    invoice_number: "INV-1",
  },
  line_items: [{ line_no: 1, description: "Fixture goods", qty: "1", line_amount: "1000", hs_code: "847130" }],
  meta: { engine_id: "fixture" },
});

describe("ExtractionReviewDialog helpers", () => {
  it("uses modal shell on desktop and sheet on mobile", () => {
    expect(extractionShellVariant(false)).toBe("modal");
    expect(extractionShellVariant(true)).toBe("sheet");
  });

  it("exposes trigger and title copy for each mode", () => {
    expect(extractionTriggerLabel("idle")).toBe("Статус распознавания");
    expect(extractionDialogTitle("review")).toBe("Распознанные данные");
  });
});

describe("ExtractionReviewPanel embedded content", () => {
  it("renders idle controls for draft user", () => {
    const html = withQuery(
      <ExtractionReviewPanel formId="f1" role="user" status="draft" hasDocuments embedded />,
    );
    expect(html).toContain("data-testid=\"extraction-idle\"");
    expect(html).toContain("data-testid=\"extraction-controls\"");
    expect(html).toContain("Запустить распознавание");
  });

  it("disables Start and shows Stop while pending", () => {
    const html = withQuery(
      <ExtractionReviewPanel formId="f1" role="user" status="creating" hasDocuments embedded />,
    );
    expect(html).toContain("data-testid=\"extraction-pending\"");
    expect(html).toContain("data-testid=\"extraction-start\"");
    expect(html).toContain("data-testid=\"extraction-stop\"");
    expect(html).toContain("Остановить распознавание");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("data-testid=\"extraction-start\"");
  });

  it("renders collapsible document text and confirm when canConfirm", () => {
    const withLayout = JSON.stringify({
      schema_version: "v1",
      header: { invoice_amount: "1000", currency: "USD" },
      line_items: [{ line_no: 1, description: "Goods", qty: "1", line_amount: "1000", hs_code: "847130" }],
      meta: { engine_id: "docling" },
      warnings: ["layout:INVOICE RAW TEXT BLOCK", "low confidence on HS"],
    });
    const html = withQuery(
      <ExtractionReviewPanel
        formId="f1"
        role="user"
        status="draft"
        invoiceJson={withLayout}
        hasDocuments
        canConfirm
        embedded
      />,
    );
    expect(html).toContain("Текст документа");
    expect(html).toContain("INVOICE RAW TEXT BLOCK");
    expect(html).toContain("Подставить в заявку");
    expect(html).not.toContain("data-testid=\"extraction-view-only-banner\"");
  });

  it("renders review fields when invoice_json present", () => {
    const html = withQuery(
      <ExtractionReviewPanel
        formId="f1"
        role="user"
        status="draft"
        invoiceJson={sampleInvoiceJson}
        hasDocuments
        canConfirm
        embedded
      />,
    );
    expect(html).toContain("data-testid=\"extraction-review\"");
    expect(html).toContain("Подставить в заявку");
    expect(html).toContain("Fixture goods");
  });

  it("hides confirm and shows honest banner when canConfirm is false", () => {
    const html = withQuery(
      <ExtractionReviewPanel
        formId="f1"
        role="user"
        status="creating"
        invoiceJson={sampleInvoiceJson}
        hasDocuments
        canConfirm={false}
        embedded
      />,
    );
    expect(html).toContain("data-testid=\"extraction-review\"");
    expect(html).toContain("data-testid=\"extraction-view-only-banner\"");
    expect(html).toContain("здесь просмотр и перезапуск");
    expect(html).not.toContain("Подтвердить распознавание");
    expect(html).not.toContain("исправить каждое поле до подтверждения");
    expect(html).toContain("disabled");
  });

  it("hides panel for provider", () => {
    const html = withQuery(
      <ExtractionReviewPanel formId="f1" role="provider" status="draft" hasDocuments embedded />,
    );
    expect(html).toBe("");
  });
});

describe("ExtractionReviewDialog shell", () => {
  it("marks modal shell when forceMobile is false", () => {
    const html = withQuery(
      <ExtractionReviewDialog
        open
        onOpenChange={() => {}}
        formId="f1"
        role="user"
        status="draft"
        forceMobile={false}
      />,
    );
    expect(html).toContain("data-testid=\"extraction-review-modal\"");
  });

  it("marks sheet shell when forceMobile is true", () => {
    const html = withQuery(
      <ExtractionReviewDialog
        open
        onOpenChange={() => {}}
        formId="f1"
        role="user"
        status="draft"
        forceMobile
      />,
    );
    expect(html).toContain("data-testid=\"extraction-review-sheet\"");
  });
});
