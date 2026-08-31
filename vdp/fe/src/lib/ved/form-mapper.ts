import type { CoreForm } from "@/lib/api/types";
import type { AttachedDocument, FormDirection, FormKind, PaymentForm, TimelineEntry } from "./types";

export function normalizeFormId(id: string): string {
  const trimmed = id.trim().toLowerCase();
  if (trimmed.includes("-")) return trimmed;
  if (trimmed.length === 32) {
    return `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20)}`;
  }
  return trimmed;
}

function parseDirection(value: string | undefined): FormDirection {
  return value === "export" ? "export" : "import";
}

function parseKind(value: string | undefined): FormKind {
  return value === "service" ? "service" : "good";
}

function amountMinorFromInvoice(amount?: string): number {
  if (!amount) return 0;
  const n = Number.parseFloat(amount.replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function formNumber(form: CoreForm): string {
  if (form.number) return form.number;
  const short = normalizeFormId(form.id).slice(0, 8).toUpperCase();
  return `ВЭД-${short}`;
}

function docsFromJson(raw?: string): AttachedDocument[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { files?: Array<{ id?: string; name?: string; type?: string }> };
    const files = parsed.files ?? [];
    return files.map((f, i) => ({
      id: f.id || `doc-${i}`,
      title: f.name || f.type || "Документ",
      ext: "PDF",
      size: "—",
      uploadedAt: new Date().toISOString(),
      kind: (f.type as AttachedDocument["kind"]) || "other",
    }));
  } catch {
    return [];
  }
}

export function historyToTimeline(
  entries: Array<{ id: string; from_status: string; to_status: string; comment?: string; created_at: string }>,
): TimelineEntry[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.comment?.trim() ? e.comment : `${e.from_status} → ${e.to_status}`,
    at: e.created_at,
    actorRole: "manager",
    done: true,
  }));
}

export function mapCoreFormToPaymentForm(form: CoreForm, extras?: { ownerName?: string }): PaymentForm {
  const invoice = (() => {
    if (!form.invoice_json) return { hsCode: "—", invoiceNumber: form.contract_number || "—" };
    try {
      const parsed = JSON.parse(form.invoice_json) as { hs_code?: string; number?: string };
      return {
        hsCode: parsed.hs_code || "—",
        invoiceNumber: parsed.number || form.contract_number || "—",
      };
    } catch {
      return { hsCode: "—", invoiceNumber: form.contract_number || "—" };
    }
  })();
  return {
    id: normalizeFormId(form.id),
    number: formNumber(form),
    status: form.status,
    direction: parseDirection(form.direction),
    kind: parseKind(form.kind),
    condition: "advance",
    amountMinor: amountMinorFromInvoice(form.invoice_amount),
    currency: form.currency || "USD",
    organizationId: form.organization_id || "",
    counterpartyId: form.counterparty_id || "",
    hsCode: invoice.hsCode,
    invoiceNumber: invoice.invoiceNumber,
    ownerName: extras?.ownerName || form.organization_name || "—",
    managerName: undefined,
    providerName: undefined,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    documents: docsFromJson(form.docs_json),
    timeline: [],
  };
}
