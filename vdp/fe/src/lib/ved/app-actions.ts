import type { ActionTone, FormStatus, VedRole } from "./types";

export type AppFormAction = {
  id: string;
  label: string;
  tone: ActionTone;
  coreAction: string;
  requiresReason?: boolean;
  confirm?: string;
};

/**
 * App CTA matrix: labels + domain use-case action ids (no nextStatus truth).
 * Coverage is partial — gate reports N/M explicitly.
 */
const MATRIX: Partial<Record<VedRole, Partial<Record<string, AppFormAction[]>>>> = {
  user: {
    draft: [
      { id: "submit", label: "Отправить на проверку", tone: "accent", coreAction: "submit" },
      {
        id: "cancel",
        label: "Отменить заявку",
        tone: "danger",
        coreAction: "cancel",
        confirm: "Отменить заявку?",
      },
    ],
    creating: [{ id: "submit", label: "Отправить на проверку", tone: "accent", coreAction: "submit" }],
    form_waiting_corrections: [
      { id: "submit_corr", label: "Отправить исправления", tone: "accent", coreAction: "submit" },
    ],
    signing_order: [
      { id: "upload_order", label: "Загрузить подписанное поручение", tone: "accent", coreAction: "user_upload_order" },
    ],
    report_waiting: [
      { id: "upload_report", label: "Загрузить отчёт", tone: "accent", coreAction: "report_upload" },
    ],
    shipment_waiting: [
      { id: "upload_shipment", label: "Загрузить отгрузку", tone: "accent", coreAction: "shipment_upload" },
    ],
  },
  internal_compliance_officer: {
    organization_waiting_verification: [
      { id: "ico_start", label: "Взять в проверку", tone: "primary", coreAction: "ico_start" },
    ],
    organization_verification: [
      { id: "ico_approve", label: "Одобрить организацию и заявку", tone: "accent", coreAction: "ico_approve" },
      {
        id: "ico_reject",
        label: "Вернуть на коррекцию",
        tone: "quiet",
        coreAction: "ico_reject",
        requiresReason: true,
      },
      { id: "ico_stop", label: "Приостановить", tone: "quiet", coreAction: "ico_stop" },
    ],
  },
  compliance_officer: {
    form_waiting_verification: [
      { id: "eco_start", label: "Взять в проверку", tone: "primary", coreAction: "eco_start" },
    ],
    form_verification: [
      { id: "eco_accept", label: "Подтвердить заявку", tone: "accent", coreAction: "eco_accept" },
      {
        id: "eco_reject",
        label: "Вернуть на коррекцию",
        tone: "quiet",
        coreAction: "eco_reject",
        requiresReason: true,
      },
    ],
  },
  manager: {
    form_accepted: [
      { id: "order_signing", label: "Отправить поручение на подпись", tone: "accent", coreAction: "order_signing" },
    ],
    signing_order_waiting_verification: [
      { id: "order_start", label: "Взять поручение в проверку", tone: "primary", coreAction: "order_start" },
    ],
    signing_order_verification: [
      { id: "order_accept", label: "Подтвердить поручение", tone: "accent", coreAction: "order_accept" },
      {
        id: "order_reject",
        label: "Вернуть поручение",
        tone: "quiet",
        coreAction: "order_reject",
        requiresReason: true,
      },
    ],
    signing_order_accepted: [
      { id: "payment_received", label: "Подтвердить получение средств", tone: "accent", coreAction: "payment_received" },
    ],
    payment_received: [
      { id: "payment_start", label: "Запустить исполнение", tone: "accent", coreAction: "payment_start" },
    ],
    payment_sent: [
      { id: "report_signing", label: "Отправить отчёт на подпись", tone: "accent", coreAction: "report_signing" },
    ],
    report_waiting_verification: [
      { id: "report_start", label: "Взять отчёт в проверку", tone: "primary", coreAction: "report_start" },
    ],
    report_verification: [
      { id: "report_accept", label: "Подтвердить отчёт", tone: "accent", coreAction: "report_accept" },
    ],
    shipment_waiting_verification: [
      { id: "shipment_start", label: "Взять отгрузку в проверку", tone: "primary", coreAction: "shipment_start" },
    ],
    shipment_verification: [
      { id: "complete", label: "Закрыть заявку", tone: "accent", coreAction: "complete" },
    ],
  },
  provider: {
    payment_processing: [
      { id: "provider_sent", label: "Платёж отправлен", tone: "accent", coreAction: "provider_sent" },
      {
        id: "provider_return",
        label: "Вернуть менеджеру",
        tone: "danger",
        coreAction: "provider_return",
        requiresReason: true,
      },
    ],
    payment_received: [
      { id: "provider_start", label: "Начать исполнение", tone: "accent", coreAction: "provider_start" },
    ],
  },
  root: {},
};

export function appActionsFor(role: VedRole, status: FormStatus): AppFormAction[] {
  return MATRIX[role]?.[status] ?? [];
}

/** Status keys that have at least one CTA for any role (for N/M reporting). */
export function coveredStatusCount(): { covered: number; totalKnown: number } {
  const covered = new Set<string>();
  for (const byStatus of Object.values(MATRIX)) {
    if (!byStatus) continue;
    for (const status of Object.keys(byStatus)) covered.add(status);
  }
  return { covered: covered.size, totalKnown: 40 };
}

export function coreActionById(actionId: string): string | undefined {
  for (const byStatus of Object.values(MATRIX)) {
    if (!byStatus) continue;
    for (const actions of Object.values(byStatus)) {
      if (!actions) continue;
      const found = actions.find((a) => a.id === actionId);
      if (found) return found.coreAction;
    }
  }
  return undefined;
}
