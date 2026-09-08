import type { ComplianceHistoryEntry, CoreForm } from "./forms";
import { actionsFor } from "@/lib/ved/actions";
import { roleTitle } from "@/lib/ved/roles";
import { statusMetaForProcess } from "@/lib/ved/process-stage-filters";
import type {
  AttachedDocument,
  FormDirection,
  FormKind,
  FormStatus,
  PaymentForm,
  PlatformUser,
  TimelineEntry,
  VedRole,
} from "@/lib/ved/types";
import type { ProcessRoleRow } from "@/lib/api/process-roles";

function parseAmountMinor(raw: string | undefined): number {
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** First HS code from invoice_json.hs_codes, or "—". */
export function hsCodeFromInvoiceJson(invoiceJson: string | undefined): string {
  if (!invoiceJson?.trim()) return "—";
  try {
    const parsed = JSON.parse(invoiceJson) as { hs_codes?: unknown };
    const codes = parsed.hs_codes;
    if (Array.isArray(codes) && codes.length > 0) {
      const first = codes.find((c) => typeof c === "string" && c.trim());
      if (typeof first === "string") return first.trim();
    }
  } catch {
    return "—";
  }
  return "—";
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
      fileId: item.file_id ?? item.id,
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

/** Maps compliance history API rows to timeline entries with human-readable status labels.
 * Newest events first (future / latest on top) for all roles. */
export function mapComplianceHistory(
  entries: ComplianceHistoryEntry[],
  users: PlatformUser[] = [],
  processRoles?: ProcessRoleRow[],
): TimelineEntry[] {
  return [...entries].reverse().map((entry) => {
    const fromLabel = statusMetaForProcess(entry.from_status as FormStatus, processRoles).label;
    const toLabel = statusMetaForProcess(entry.to_status as FormStatus, processRoles).label;
    const transition = humanTimelineTitle(entry.from_status, entry.to_status, fromLabel, toLabel);
    const actor = users.find((u) => u.id === entry.actor_id);
    return {
      id: entry.id,
      title: entry.comment ? `${transition}: ${entry.comment}` : transition,
      at: entry.created_at,
      actorRole: actor?.role ?? inferTimelineActor(entry.from_status),
      actorName: actor?.name,
      done: true,
    };
  });
}

function humanTimelineTitle(
  fromStatus: string,
  toStatus: string,
  fromLabel: string,
  toLabel: string,
): string {
  if (fromStatus === "creating" && toStatus === "draft") {
    return "Заявка создана (черновик готов к отправке)";
  }
  if (fromStatus === "draft" && toStatus === "form_waiting_verification") {
    return "Заявка отправлена на проверку";
  }
  if (fromStatus === "form_waiting_verification" && toStatus === "form_verification") {
    return "Заявка взята в проверку";
  }
  if (toStatus === "form_waiting_corrections" || toStatus.includes("corrections")) {
    return "Заявка возвращена на доработку";
  }
  if (toStatus === "form_accepted") {
    return "Заявка подтверждена";
  }
  return `${fromLabel} → ${toLabel}`;
}

/** Best-effort actor for a transition: role that had actions on the previous status. */
function inferTimelineActor(fromStatus: string): VedRole {
  const candidates: VedRole[] = [
    "user",
    "internal_compliance_officer",
    "compliance_officer",
    "manager",
    "provider",
  ];
  for (const role of candidates) {
    if (actionsFor(role, fromStatus as FormStatus).length > 0) return role;
  }
  return "user";
}

/**
 * Role(s) that currently own CTAs on this status (for guided next-step copy).
 * Excludes root union. Pass processRoles so disabled ICO/ECO transfer to manager.
 */
export function waitingActorRoles(status: FormStatus, processRoles?: ProcessRoleRow[]): VedRole[] {
  const roles: VedRole[] = [
    "user",
    "internal_compliance_officer",
    "compliance_officer",
    "manager",
    "provider",
  ];
  return roles.filter((role) => actionsFor(role, status, processRoles).length > 0);
}

/** Human label for who should act next on this status. */
export function waitingActorLabel(status: FormStatus, processRoles?: ProcessRoleRow[]): string | null {
  const roles = waitingActorRoles(status, processRoles);
  if (roles.length === 0) return null;
  return roles.map((r) => roleTitle(r)).join(", ");
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
    hsCode: hsCodeFromInvoiceJson(form.invoice_json),
    invoiceNumber: form.contract_number || "—",
    ownerName,
    managerId: form.manager_id || undefined,
    managerName: undefined,
    providerId: form.provider_id || undefined,
    providerName: form.provider_id || undefined,
    channel: form.channel === "bank" ? "bank" : form.channel === "ui" ? "ui" : undefined,
    correlationId: form.correlation_id || undefined,
    agentId: form.agent_id || undefined,
    contractId: form.contract_id || undefined,
    noDocuments: form.no_documents || undefined,
    invoiceJson: form.invoice_json || undefined,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    documents: parseDocsJson(form.docs_json, id),
    timeline,
  };
}

export function nextStepHint(status: string, role?: VedRole, processRoles?: ProcessRoleRow[]): string {
  const formStatus = status as FormStatus;
  const myActions = role ? actionsFor(role, formStatus, processRoles) : [];
  if (myActions.length > 0) {
    return `Следующий шаг: ${myActions[0]!.label}.`;
  }
  const waiting = waitingActorLabel(formStatus, processRoles);
  if (waiting) {
    return `Сейчас действует: ${waiting}. Для вашей роли действий нет — дождитесь их решения.`;
  }
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
