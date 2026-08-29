import type { ComplianceHistoryEntry, CoreForm } from "./forms";
import type { AttachedDocument, FormDirection, FormKind, PaymentForm, TimelineEntry, VedRole } from "@/lib/ved/types";

function parseAmountMinor(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

function mapDirection(value: string): FormDirection {
  return value === "export" ? "export" : "import";
}

function mapKind(value: string): FormKind {
  return value === "service" ? "service" : "good";
}

type DocsJsonItem = {
  id?: string;
  file_id?: string;
  kind?: string;
  label?: string;
  name?: string;
  mime?: string;
};

function docKind(raw: string | undefined): AttachedDocument["kind"] {
  const k = (raw ?? "").toLowerCase();
  if (k.includes("invoice")) return "invoice";
  if (k.includes("contract")) return "contract";
  if (k.includes("order")) return "order";
  if (k.includes("payment")) return "payment";
  if (k.includes("report")) return "report";
  if (k.includes("shipment")) return "shipment";
  return "other";
}

function extFromMime(mime: string | undefined): AttachedDocument["ext"] {
  if (!mime) return "PDF";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  if (mime.includes("sheet") || mime.includes("excel")) return "XLSX";
  if (mime.includes("word")) return "DOCX";
  return "PDF";
}

/** Parses core docs_json into UI document list. */
export function parseDocsJson(raw: string | undefined, formId: string): AttachedDocument[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as DocsJsonItem[] | { files?: DocsJsonItem[] };
    const items = Array.isArray(parsed) ? parsed : (parsed.files ?? []);
    return items.map((item, index) => ({
      id: item.id ?? item.file_id ?? `${formId}-doc-${index}`,
      title: item.label ?? item.name ?? item.kind ?? "Документ",
      ext: extFromMime(item.mime),
      size: "—",
      uploadedAt: new Date().toISOString(),
      kind: docKind(item.kind),
    }));
  } catch {
    return [];
  }
}

/** Maps compliance history API rows to timeline entries. */
export function mapComplianceHistory(entries: ComplianceHistoryEntry[]): TimelineEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.comment
      ? `${entry.from_status} → ${entry.to_status}: ${entry.comment}`
      : `${entry.from_status} → ${entry.to_status}`,
    at: entry.created_at,
    actorRole: "manager" as VedRole,
    done: true,
  }));
}

/**
 * Extracts reject mark/text from the latest corrections transition comment
 * (FE sends `mark · reason` via transitionForm).
 */
export function rejectFromHistory(entries: ComplianceHistoryEntry[]): {
  rejectText?: string;
  rejectMark?: string;
} {
  const last = [...entries]
    .reverse()
    .find((entry) => entry.to_status.includes("corrections") || entry.to_status.includes("correction"));
  if (!last?.comment?.trim()) return {};
  const parts = last.comment.split(" · ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { rejectMark: parts[0], rejectText: parts.slice(1).join(" · ") };
  }
  return { rejectText: last.comment.trim() };
}

/** Canonical dashed UUID so create/list/get ids compare equal after postgres. */
export function normalizeFormId(id: string): string {
  const hex = id.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32 || !/^[0-9a-f]{32}$/.test(hex)) return id;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Maps core Form DTO to UI PaymentForm projection. */
export function mapCoreFormToPaymentForm(
  form: CoreForm,
  ownerName = "—",
  timeline: TimelineEntry[] = [],
): PaymentForm {
  const id = normalizeFormId(form.id);
  const shortId = id.length > 8 ? id.slice(0, 8) : id;
  return {
    id,
    number: `ВЭД-${shortId}`,
    status: form.status,
    direction: mapDirection(form.direction),
    kind: mapKind(form.kind),
    condition: "advance",
    amountMinor: parseAmountMinor(form.invoice_amount),
    currency: form.currency || "USD",
    organizationId: form.organization_id || "—",
    counterpartyId: form.counterparty_id || "—",
    hsCode: "—",
    invoiceNumber: form.contract_number || "—",
    ownerName,
    managerName: form.manager_id || undefined,
    providerId: form.provider_id || undefined,
    providerName: form.provider_id || undefined,
    channel: form.channel === "bank" ? "bank" : form.channel === "ui" ? "ui" : undefined,
    correlationId: form.correlation_id || undefined,
    agentId: form.agent_id || undefined,
    contractId: form.contract_id || undefined,
    noDocuments: form.no_documents || undefined,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    documents: parseDocsJson(form.docs_json, id),
    timeline,
  };
}

export function nextStepHint(status: string): string {
  if (status === "draft" || status === "creating") return "Отправьте заявку на проверку.";
  if (status.includes("waiting_verification") || status.includes("_verification")) {
    return "Ожидайте решения проверяющего или возьмите в работу, если это ваша роль.";
  }
  if (status.includes("corrections") || status.includes("correction")) {
    return "Исправьте замечания и отправьте повторно.";
  }
  if (status.startsWith("payment")) return "Контролируйте исполнение платежа.";
  if (status.startsWith("report") || status.startsWith("shipment")) return "Закройте документы и отгрузку.";
  if (status === "completed") return "Заявка закрыта.";
  if (status.startsWith("canceled")) return "Заявка отменена.";
  return "Смотрите доступные действия справа.";
}
