import type { ComplianceHistoryEntry, CoreForm } from "./forms";
import { actionsFor } from "@/lib/ved/actions";
import { IMPORT_ADVANCE_AWAITS_TREASURER, isImportAdvanceCoverageGate } from "@/lib/ved/manager-payment";
import { effectiveActionsFor, effectiveActionsFormCtx } from "@/lib/ved/effective-actions";
import { documentSize } from "@/lib/ved/document-upload";
import { roleTitle } from "@/lib/ved/roles";
import { statusMetaForProcess } from "@/lib/ved/process-stage-filters";
import { paymentMethodToCondition } from "@/lib/ved/wizard-steps";
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

function stringCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
    .map((code) => code.trim());
}

/** HS codes from the catalog key, extraction header, or line items. Several codes joined by comma. */
export function hsCodeFromInvoiceJson(invoiceJson: string | undefined): string {
  if (!invoiceJson?.trim()) return "";
  try {
    const parsed = JSON.parse(invoiceJson) as {
      hs_codes?: unknown;
      header?: { hs_codes?: unknown };
      line_items?: { hs_code?: unknown }[];
    };
    const fromLines = (parsed.line_items ?? []).flatMap((line) =>
      typeof line.hs_code === "string" && line.hs_code.trim() ? [line.hs_code.trim()] : [],
    );
    const unique = [...new Set([...stringCodes(parsed.hs_codes), ...stringCodes(parsed.header?.hs_codes), ...fromLines])];
    return unique.length > 0 ? unique.join(", ") : "";
  } catch {
    return "";
  }
}

/** Invoice number from extraction JSON. Never the contract number. */
export function invoiceNumberFromInvoiceJson(invoiceJson: string | undefined): string | undefined {
  if (!invoiceJson?.trim()) return undefined;
  try {
    const parsed = JSON.parse(invoiceJson) as { header?: { invoice_number?: string }; invoice_number?: string };
    const value = (parsed.header?.invoice_number ?? parsed.invoice_number ?? "").trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

const MACHINE_HISTORY_COMMENTS = new Set(["extraction_started", "extraction_confirmed", "resolve_contract_branch"]);

/** Human timeline suffix. Machine comments are not shown as raw function names. */
export function humanHistoryComment(comment: string | undefined): string | undefined {
  const text = comment?.trim() ?? "";
  if (!text || text === "extraction_started" || text === "extraction_confirmed") return undefined;
  if (text === "resolve_contract_branch") return "ожидает подписанный агентский договор";
  return text;
}

const ACCOUNT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a label is a raw account id, not a person name. */
export function isAccountUuid(value: string | undefined): boolean {
  return Boolean(value && ACCOUNT_UUID.test(value.trim()));
}

type NamedAccount = { id: string; name: string; role?: string };

/**
 * Client column: the user-role owner of the form.
 * Never the signed-in root, manager, or provider. User viewer may keep their own name so the list filter still matches.
 */
export function resolveClientName(
  accountId: string | undefined,
  users: NamedAccount[],
  viewer?: { role?: string; name?: string },
): string {
  const owner = users.find((user) => user.id === accountId && user.role === "user");
  if (owner?.name && !isAccountUuid(owner.name)) return owner.name;
  if (viewer?.role === "user" && viewer.name && !isAccountUuid(viewer.name)) return viewer.name;
  return "Клиент не найден";
}

/** Assigned person. Missing id is «не назначен». A set id without a name is not a UUID and not «не назначен». */
export function assignedManagerLabel(accountId: string | undefined, users: NamedAccount[], knownName?: string): string {
  if (!accountId) return "не назначен";
  const name = users.find((user) => user.id === accountId)?.name ?? knownName;
  if (name && !isAccountUuid(name)) return name;
  return "имя не найдено";
}

/** Provider line. Never a UUID. */
export function assignedProviderLabel(accountId: string | undefined, users: NamedAccount[], knownName?: string): string {
  if (!accountId) return "не назначен";
  const name = users.find((user) => user.id === accountId)?.name ?? knownName;
  if (name && !isAccountUuid(name)) return name;
  return "не назначен";
}

/** Red return banner only while the form is actually on correction and the reason is human. */
export function showReturnBanner(status: string, rejectText?: string, rejectMark?: string): boolean {
  return status.includes("correction") && Boolean(rejectText || rejectMark);
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
  bytes?: number;
  size?: number;
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
    return items.map((item, index) => {
      const byteCount = item.bytes ?? item.size;
      const sizeLabel =
        typeof byteCount === "number" && byteCount > 0 ? documentSize(byteCount) : "";
      return {
        id: item.id ?? item.file_id ?? `${formId}-doc-${index}`,
        fileId: item.file_id ?? item.id,
        title: item.label ?? item.name ?? item.kind ?? "Документ",
        ext: extFromMime(item.mime),
        size: sizeLabel,
        uploadedAt: new Date().toISOString(),
        kind: docKind(item.kind),
      };
    });
  } catch {
    return [];
  }
}

/** Maps compliance history API rows to timeline entries with human-readable status labels.
 * Newest events first (future / latest on top) for all roles. */
/** Maps core compliance-history rows to cabinet timeline items. */
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
      title: humanHistoryComment(entry.comment)
        ? `${transition}: ${humanHistoryComment(entry.comment)}`
        : transition,
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
  if (fromStatus === "draft" && toStatus === "organization_waiting_verification") {
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
export function waitingActorRoles(
  status: FormStatus,
  processRoles?: ProcessRoleRow[],
  formCtx?: {
    condition?: string;
    direction?: string;
    paymentMethod?: string;
    contractId?: string;
    providerId?: string;
  },
): VedRole[] {
  const roles: VedRole[] = [
    "user",
    "internal_compliance_officer",
    "compliance_officer",
    "manager",
    "treasurer",
    "provider",
  ];
  const ctx = effectiveActionsFormCtx({
    status,
    direction: formCtx?.direction === "export" ? "export" : formCtx?.direction === "import" ? "import" : undefined,
    condition: formCtx?.condition === "postPayment" ? "postPayment" : formCtx?.condition === "advance" ? "advance" : undefined,
    paymentMethod: formCtx?.paymentMethod,
    contractId: formCtx?.contractId,
    providerId: formCtx?.providerId,
  });
  return roles.filter((role) => effectiveActionsFor(role, ctx, processRoles).length > 0);
}

/** Human label for who should act next on this status. */
export function waitingActorLabel(
  status: FormStatus,
  processRoles?: ProcessRoleRow[],
  formCtx?: {
    condition?: string;
    direction?: string;
    paymentMethod?: string;
    contractId?: string;
    providerId?: string;
  },
): string | null {
  const roles = waitingActorRoles(status, processRoles, formCtx);
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
  const last = [...entries].reverse().find((entry) => {
    const onCorrection = entry.to_status.includes("corrections") || entry.to_status.includes("correction");
    const comment = entry.comment?.trim() ?? "";
    return onCorrection && comment.length > 0 && !MACHINE_HISTORY_COMMENTS.has(comment);
  });
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
    condition: paymentMethodToCondition(form.payment_method),
    amountMinor: parseAmountMinor(form.invoice_amount),
    currency: form.currency || "USD",
    organizationId: form.organization_id || "—",
    counterpartyId: form.counterparty_id || "—",
    hsCode: hsCodeFromInvoiceJson(form.invoice_json) || "—",
    invoiceNumber: invoiceNumberFromInvoiceJson(form.invoice_json) ?? "",
    pogStatus: form.pog_status || undefined,
    pogFileId: form.pog_file_id || undefined,
    pogKind: form.pog_kind || undefined,
    contractNumber: form.contract_number || undefined,
    ownerAccountId: form.account_id || undefined,
    ownerName,
    managerId: form.manager_id || undefined,
    managerName: undefined,
    providerId: form.provider_id || undefined,
    providerName: undefined,
    channel: form.channel === "bank" ? "bank" : form.channel === "ui" ? "ui" : undefined,
    correlationId: form.correlation_id || undefined,
    agentId: form.agent_id || undefined,
    contractId: form.contract_id || undefined,
    noDocuments: form.no_documents || undefined,
    invoiceJson: form.invoice_json || undefined,
    paymentMethod: form.payment_method || undefined,
    platformPostpayMode: form.platform_postpay_mode || undefined,
    rateOnProvider: form.rate_on_provider || undefined,
    rate: form.rate
      ? {
          value: form.rate.value || undefined,
          currency: form.rate.currency || undefined,
          source: form.rate.source || undefined,
        }
      : undefined,
    commission: form.commission
      ? {
          rewardMode: form.commission.reward_mode || undefined,
          feeAmount: form.commission.fee_amount || undefined,
          feePercent: form.commission.fee_percent || undefined,
          feeFix: form.commission.fee_fix || undefined,
          feeCurrency: form.commission.fee_currency || undefined,
        }
      : undefined,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    documents: parseDocsJson(form.docs_json, id),
    timeline,
  };
}

/** Guided next-step copy from status + role matrix (not AuthZ). */
export function nextStepHint(
  status: string,
  role?: VedRole,
  processRoles?: ProcessRoleRow[],
  formCtx?: {
    condition?: string;
    direction?: string;
    paymentMethod?: string;
    contractId?: string;
    providerId?: string;
  },
): string {
  const formStatus = status as FormStatus;
  if (
    status === "payment_received" &&
    (role === "manager" || role === "root") &&
    isImportAdvanceCoverageGate({
      condition: formCtx?.condition,
      direction: formCtx?.direction,
      paymentMethod: formCtx?.paymentMethod,
    })
  ) {
    return `Следующий шаг: казначей подтверждает покрытие. ${IMPORT_ADVANCE_AWAITS_TREASURER}`;
  }
  const ctx = role
    ? effectiveActionsFormCtx({
        status: formStatus,
        direction: formCtx?.direction === "export" ? "export" : formCtx?.direction === "import" ? "import" : undefined,
        condition:
          formCtx?.condition === "postPayment"
            ? "postPayment"
            : formCtx?.condition === "advance"
              ? "advance"
              : undefined,
        paymentMethod: formCtx?.paymentMethod,
        contractId: formCtx?.contractId,
        providerId: formCtx?.providerId,
      })
    : null;
  const myActions = role && ctx ? effectiveActionsFor(role, ctx, processRoles) : [];
  if (myActions.length > 0) {
    return `Следующий шаг: ${myActions[0]!.label}.`;
  }
  if (status === "form_accepted") {
    return "Заявка подтверждена. Дальше менеджер назначает платёжного агента и готовит договор.";
  }
  if (
    role === "user" &&
    (status === "organization_waiting_verification" || status === "organization_verification")
  ) {
    return "Сейчас проверяют организацию. Это не проверка заявки — дождитесь решения по организации.";
  }
  const waiting = waitingActorLabel(formStatus, processRoles, formCtx);
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
  if (status === "report_verification") return "Подтвердите отчет и завершите сделку.";
  if (status.startsWith("report")) return "Подпишите и подтвердите отчёт агента — после этого сделка завершена.";
  if (status.startsWith("shipment")) return "Закройте документы отгрузки (опциональная ветка).";
  if (status === "completed") return "Заявка закрыта.";
  if (status.startsWith("canceled")) return "Заявка отменена.";
  return "Смотрите доступные действия справа.";
}
