import type { FormAction, FormStatus, VedRole } from "./types";

/**
 * Матрица действий роль × статус.
 * Портирована из lifecycle-action.matrix.ts / lifecycle-action.catalog.ts backend-for-ved.
 */
const MATRIX: Record<VedRole, Record<string, FormAction[]>> = {
  user: {
    draft: [
      { id: "accept_form", label: "Отправить на проверку", tone: "accent", nextStatus: "organization_waiting_verification" },
      { id: "cancel_form", label: "Отменить заявку", tone: "danger", nextStatus: "canceled_by_user", confirm: "Отменить заявку?" },
    ],
    creating: [
      { id: "accept_form", label: "Отправить на проверку", tone: "accent", nextStatus: "organization_waiting_verification" },
    ],
    form_waiting_corrections: [
      { id: "accept_corrections", label: "Отправить исправления", tone: "accent", nextStatus: "form_waiting_verification" },
      { id: "cancel_form", label: "Отменить заявку", tone: "danger", nextStatus: "canceled_by_user", confirm: "Отменить заявку?" },
    ],
    contract_waiting: [
      { id: "upload_contract", label: "Загрузить агентский договор", tone: "accent", requiresFile: true, nextStatus: "contract_verification" },
    ],
    contract_waiting_correction: [
      { id: "upload_contract", label: "Загрузить исправленный договор", tone: "accent", requiresFile: true, nextStatus: "contract_verification" },
    ],
    signing_order: [
      { id: "upload_order", label: "Загрузить подписанное поручение", tone: "accent", requiresFile: true, nextStatus: "signing_order_waiting_verification" },
    ],
    signing_order_waiting_corrections: [
      { id: "upload_order", label: "Загрузить исправленное поручение", tone: "accent", requiresFile: true, nextStatus: "signing_order_waiting_verification" },
    ],
    advance_signing_order: [
      { id: "upload_order_advance", label: "Загрузить доп. поручение", tone: "accent", requiresFile: true, nextStatus: "advance_signing_order_waiting_verification" },
    ],
    signing_order_accepted: [
      { id: "upload_payments", label: "Загрузить платёжное поручение", tone: "accent", requiresFile: true, nextStatus: "payment_received" },
    ],
    report_waiting: [
      { id: "upload_report", label: "Загрузить подписанный отчёт", tone: "accent", requiresFile: true, nextStatus: "report_waiting_verification" },
    ],
    report_waiting_corrections: [
      { id: "upload_report", label: "Загрузить исправленный отчёт", tone: "accent", requiresFile: true, nextStatus: "report_waiting_verification" },
    ],
    shipment_waiting: [
      { id: "upload_shipment", label: "Загрузить документы об отгрузке", tone: "accent", requiresFile: true, nextStatus: "shipment_waiting_verification" },
    ],
    shipment_waiting_corrections: [
      { id: "upload_shipment", label: "Загрузить исправленные документы", tone: "accent", requiresFile: true, nextStatus: "shipment_waiting_verification" },
    ],
  },

  internal_compliance_officer: {
    organization_waiting_verification: [
      { id: "ico_form_start", label: "Взять в проверку", tone: "primary", nextStatus: "organization_verification" },
    ],
    organization_verification: [
      { id: "ico_form_accept", label: "Одобрить и передать во внешний комплаенс", tone: "accent", nextStatus: "form_waiting_verification" },
      { id: "ico_form_reject", label: "Вернуть на доработку", tone: "quiet", requiresReason: true, requiresMark: true, nextStatus: "form_waiting_corrections" },
      { id: "ico_form_stop", label: "Приостановить проверку", tone: "quiet", nextStatus: "organization_waiting_verification" },
      {
        id: "ico_cancel",
        label: "Отклонить заявку",
        tone: "danger",
        requiresReason: true,
        nextStatus: "canceled_by_internal_compliance_officer",
        confirm: "Отклонить заявку без права повторной подачи?",
      },
    ],
  },

  compliance_officer: {
    form_waiting_verification: [{ id: "eco_form_start", label: "Взять в проверку", tone: "primary", nextStatus: "form_verification" }],
    form_verification: [
      { id: "eco_form_accept", label: "Подтвердить заявку", tone: "accent", nextStatus: "form_accepted" },
      { id: "eco_form_reject", label: "Вернуть на доработку", tone: "quiet", requiresReason: true, requiresMark: true, nextStatus: "form_waiting_corrections" },
      { id: "eco_form_stop", label: "Приостановить проверку", tone: "quiet", nextStatus: "form_waiting_verification" },
      {
        id: "eco_cancel",
        label: "Отклонить заявку",
        tone: "danger",
        requiresReason: true,
        nextStatus: "canceled_by_compliance_officer",
        confirm: "Отклонить заявку без права повторной подачи?",
      },
    ],
  },

  manager: {
    form_accepted: [
      { id: "mgr_contract_attach", label: "Прикрепить агентский договор", tone: "accent", requiresFile: true, nextStatus: "contract_waiting" },
      { id: "mgr_form_reject", label: "Вернуть на коррекцию", tone: "quiet", requiresReason: true, nextStatus: "form_waiting_corrections" },
    ],
    contract_verification: [
      { id: "mgr_order_generate", label: "Сформировать поручение принципала", tone: "accent", nextStatus: "signing_order" },
      { id: "mgr_order_attach", label: "Загрузить своё поручение", tone: "quiet", requiresFile: true, nextStatus: "signing_order" },
    ],
    signing_order_waiting_verification: [
      { id: "mgr_order_start", label: "Взять поручение в проверку", tone: "primary", nextStatus: "signing_order_verification" },
    ],
    signing_order_verification: [
      { id: "mgr_order_accept", label: "Подтвердить поручение", tone: "accent", nextStatus: "signing_order_accepted" },
      { id: "mgr_order_reject", label: "Вернуть поручение", tone: "quiet", requiresReason: true, nextStatus: "signing_order_waiting_corrections" },
      { id: "mgr_order_stop", label: "Приостановить", tone: "quiet", nextStatus: "signing_order_waiting_verification" },
    ],
    advance_signing_order_waiting_verification: [
      { id: "mgr_order_advance_accept", label: "Подтвердить доп. поручение", tone: "accent", nextStatus: "advance_signing_order_accepted" },
      { id: "mgr_order_advance_reject", label: "Вернуть доп. поручение", tone: "quiet", requiresReason: true, nextStatus: "advance_signing_order_waiting_corrections" },
    ],
    signing_order_accepted: [
      { id: "mgr_payment_received", label: "Подтвердить получение средств", tone: "accent", nextStatus: "payment_received" },
    ],
    payment_received: [
      { id: "mgr_assign_provider", label: "Назначить провайдера", tone: "primary", nextStatus: "payment_received" },
      { id: "mgr_payment_start", label: "Запустить исполнение платежа", tone: "accent", nextStatus: "payment_processing" },
    ],
    manager_checking: [
      { id: "mgr_payment_start", label: "Вернуть в исполнение", tone: "accent", nextStatus: "payment_processing" },
      { id: "mgr_cancel", label: "Отменить заявку", tone: "danger", requiresReason: true, nextStatus: "canceled_by_manager" },
    ],
    payment_sent: [{ id: "mgr_report_signing", label: "Отправить отчёт агента на подпись", tone: "accent", nextStatus: "report_waiting" }],
    report_waiting_verification: [
      { id: "mgr_report_start", label: "Взять отчёт в проверку", tone: "primary", nextStatus: "report_verification" },
    ],
    report_verification: [
      { id: "mgr_report_accept", label: "Подтвердить отчёт", tone: "accent", nextStatus: "shipment_waiting" },
      { id: "mgr_report_reject", label: "Вернуть отчёт", tone: "quiet", requiresReason: true, nextStatus: "report_waiting_corrections" },
    ],
    shipment_waiting_verification: [
      { id: "mgr_shipment_start", label: "Взять отгрузку в проверку", tone: "primary", nextStatus: "shipment_verification" },
    ],
    shipment_verification: [
      { id: "mgr_completed", label: "Закрыть заявку", tone: "accent", nextStatus: "completed" },
      { id: "mgr_shipment_reject", label: "Вернуть документы", tone: "quiet", requiresReason: true, nextStatus: "shipment_waiting_corrections" },
    ],
  },

  provider: {
    payment_processing: [
      { id: "prov_attach_proof", label: "Прикрепить подтверждение платежа", tone: "quiet", requiresFile: true, nextStatus: "payment_processing" },
      { id: "prov_payment_sent", label: "Платёж отправлен", tone: "accent", nextStatus: "payment_sent" },
      { id: "prov_payment_return", label: "Вернуть менеджеру", tone: "danger", requiresReason: true, nextStatus: "manager_checking" },
    ],
    payment_received: [{ id: "prov_payment_start", label: "Начать исполнение", tone: "accent", nextStatus: "payment_processing" }],
  },

  root: {},
};

/** Root видит cancel на любой активной заявке (bulk и row-level CTA). */
const ROOT_CANCELABLE = (status: FormStatus) => !status.startsWith("canceled") && status !== "completed";

const OPERATIONAL_ROLES: VedRole[] = ["user", "internal_compliance_officer", "compliance_officer", "manager", "provider"];

/** Суперадмин управляет любой заявкой: доступны действия всех ролей на текущем статусе. */
function rootActions(status: FormStatus): FormAction[] {
  const seen = new Set<string>();
  const all: FormAction[] = [];
  OPERATIONAL_ROLES.forEach((role) => {
    (MATRIX[role]?.[status] ?? []).forEach((action) => {
      if (seen.has(action.id)) return;
      seen.add(action.id);
      all.push(action);
    });
  });
  if (ROOT_CANCELABLE(status)) {
    all.push({
      id: "root_cancel_form",
      label: "Отменить заявку",
      tone: "danger",
      requiresReason: true,
      nextStatus: "canceled_by_manager",
      confirm: "Отменить заявку от имени администратора?",
    });
  }
  return all;
}

export function actionsFor(role: VedRole, status: FormStatus): FormAction[] {
  if (role === "root") return rootActions(status);
  return MATRIX[role]?.[status] ?? [];
}


/** Провайдер не видит ПДн клиента — узкий набор колонок. */
export const PROVIDER_HIDDEN_FIELDS = ["ownerName", "organizationEmail", "organizationPhone", "managerName"];
