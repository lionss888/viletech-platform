import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PogStatusPanel } from "@/components/ved/pog-status-panel";
import { StatusBadge } from "@/components/ved/StatusBadge";
import { overlayStatusMetaForPog, isPogFormationStatus } from "@/lib/ved/pog-status-copy";
import { statusMeta } from "@/lib/ved/statuses";
import type { PaymentForm } from "@/lib/ved/types";

function withQuery(children: ReactNode): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderToStaticMarkup(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

function sampleForm(overrides: Partial<PaymentForm>): PaymentForm {
  return {
    id: "f1",
    number: "ВЭД-f1",
    status: "signing_order",
    direction: "import",
    kind: "good",
    condition: "advance",
    amountMinor: 10000,
    currency: "USD",
    organizationId: "o1",
    counterpartyId: "c1",
    hsCode: "—",
    invoiceNumber: "",
    ownerName: "User",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    documents: [],
    timeline: [],
    ...overrides,
  };
}

describe("overlayStatusMetaForPog", () => {
  it("marks signing_order + idle as awaiting formation", () => {
    const base = statusMeta("signing_order");
    expect(base.label).toMatch(/подпис/i);
    const overlay = overlayStatusMetaForPog(base, "signing_order", "idle");
    expect(overlay.label).toBe("Ожидает формирования поручения");
    expect(overlay.label).not.toMatch(/отправлено на подпись/i);
  });

  it("marks pending as forming PDF", () => {
    const overlay = overlayStatusMetaForPog(statusMeta("signing_order"), "signing_order", "pending");
    expect(overlay.label).toBe("Формируем PDF поручения…");
    expect(overlay.tone).toBe("work");
  });

  it("keeps canonical label after success", () => {
    const base = statusMeta("signing_order");
    const overlay = overlayStatusMetaForPog(base, "signing_order", "success");
    expect(overlay.label).toBe(base.label);
  });

  it("does not overlay unrelated statuses", () => {
    expect(isPogFormationStatus("form_accepted")).toBe(false);
    const base = statusMeta("form_accepted");
    expect(overlayStatusMetaForPog(base, "form_accepted", "idle").label).toBe(base.label);
  });
});

describe("StatusBadge pog overlay", () => {
  it("shows formation copy for signing_order idle", () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="signing_order" full pogStatus="idle" />,
    );
    expect(html).toContain("Ожидает формирования поручения");
    expect(html).not.toContain("отправлено на подпись");
  });
});

describe("PogStatusPanel", () => {
  it("hides panel on success", () => {
    const html = withQuery(
      <PogStatusPanel form={sampleForm({ pogStatus: "success", pogFileId: "file-1" })} />,
    );
    expect(html).toBe("");
  });

  it("shows indeterminate progress while pending", () => {
    const html = withQuery(<PogStatusPanel form={sampleForm({ pogStatus: "pending" })} />);
    expect(html).toContain("pog-status-panel");
    expect(html).toContain("pog-progress");
    expect(html).toContain("Формируем PDF поручения");
  });

  it("keeps retry on idle and failed", () => {
    const idle = withQuery(<PogStatusPanel form={sampleForm({ pogStatus: "idle" })} />);
    expect(idle).toContain("pog-retry");
    const failed = withQuery(<PogStatusPanel form={sampleForm({ pogStatus: "failed" })} />);
    expect(failed).toContain("pog-retry");
  });
});
