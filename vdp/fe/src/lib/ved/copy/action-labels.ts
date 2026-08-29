import type { FormAction, FormStatus } from "../types";

export type UserActionCopy = { label: string; confirm?: string };

/** User-facing action labels (canonical action id unchanged). Source: glossariy-po-rolyam.txt */
export const USER_ACTION_LABELS: Record<string, UserActionCopy> = {
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

const USER_ACTION_STATUS_LABELS: Partial<Record<FormStatus, Partial<Record<string, UserActionCopy>>>> = {
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

export function applyUserActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return actions.map((action) => {
    const statusCopy = USER_ACTION_STATUS_LABELS[status]?.[action.id];
    const copy = statusCopy ?? USER_ACTION_LABELS[action.id];
    if (!copy) return action;
    return {
      ...action,
      label: copy.label,
      confirm: copy.confirm ?? action.confirm,
    };
  });
}
