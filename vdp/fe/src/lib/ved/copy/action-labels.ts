import type { FormAction, FormStatus } from "../types";

export type ActionCopy = { label: string; confirm?: string };

/** User-facing action labels (canonical action id unchanged). Source: glossariy-po-rolyam.txt */
export const USER_ACTION_LABELS: Record<string, ActionCopy> = {
  recognize_complete: { label: "Завершить распознавание документов" },
  accept_form: { label: "Отправить заявку на проверку" },
  accept_corrections: { label: "Отправить исправления" },
  cancel_form: { label: "Отменить заявку", confirm: "Отменить заявку? Действие необратимо." },

  upload_contract: { label: "Загрузить подписанный агентский договор" },
  upload_order: { label: "Загрузить подписанное поручение" },
  upload_order_advance: { label: "Загрузить подписанное доп. поручение" },
  upload_payments: { label: "Загрузить платёжное поручение на оплату" },
  upload_report: { label: "Загрузить подписанный отчёт агента" },
  upload_shipment: { label: "Загрузить документы об отгрузке" },
};

const USER_ACTION_STATUS_LABELS: Partial<Record<FormStatus, Partial<Record<string, ActionCopy>>>> = {
  contract_waiting_correction: {
    upload_contract: { label: "Загрузить исправленный агентский договор" },
  },
  signing_order_waiting_corrections: {
    upload_order: { label: "Загрузить исправленное поручение" },
  },
  advance_signing_order_waiting_corrections: {
    upload_order_advance: { label: "Загрузить исправленное доп. поручение" },
  },
  report_waiting_corrections: {
    upload_report: { label: "Загрузить исправленный отчёт агента" },
  },
  shipment_waiting_corrections: {
    upload_shipment: { label: "Загрузить исправленные документы об отгрузке" },
  },
};

/** Internal CO action labels — glossary column «ico». */
export const ICO_ACTION_LABELS: Record<string, ActionCopy> = {
  ico_form_start: { label: "Взять организацию/заявку в проверку" },
  ico_form_accept: { label: "Одобрить и передать дальше" },
  ico_form_reject: { label: "Вернуть клиенту на доработку" },
  ico_form_stop: { label: "Вернуть в очередь на проверку" },
  ico_cancel: {
    label: "Отклонить заявку",
    confirm: "Отклонить заявку без права повторной подачи?",
  },
};

export function applyUserActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return applyRoleActionLabels(actions, status, USER_ACTION_LABELS, USER_ACTION_STATUS_LABELS);
}

export function applyIcoActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return applyRoleActionLabels(actions, status, ICO_ACTION_LABELS);
}

/** External CO action labels — glossary column «eco». */
export const ECO_ACTION_LABELS: Record<string, ActionCopy> = {
  eco_form_start: { label: "Взять сделку в проверку" },
  eco_form_accept: { label: "Подтвердить условия сделки" },
  eco_form_reject: { label: "Вернуть сделку на доработку" },
  eco_form_stop: { label: "Вернуть в очередь на проверку" },
  eco_cancel: {
    label: "Отклонить сделку",
    confirm: "Отклонить сделку без права повторной подачи?",
  },
};

export function applyEcoActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return applyRoleActionLabels(actions, status, ECO_ACTION_LABELS);
}

function applyRoleActionLabels(
  actions: FormAction[],
  status: FormStatus,
  labels: Record<string, ActionCopy>,
  statusLabels?: Partial<Record<FormStatus, Partial<Record<string, ActionCopy>>>>,
): FormAction[] {
  return actions.map((action) => {
    const statusCopy = statusLabels?.[status]?.[action.id];
    const copy = statusCopy ?? labels[action.id];
    if (!copy) return action;
    return {
      ...action,
      label: copy.label,
      confirm: copy.confirm ?? action.confirm,
    };
  });
}
