import type { FormAction, FormStatus } from "../types";
import type { ActionCopy, RoleStatusLabel } from "./status-labels";

/** Manager: payment & refund phase. Glossary column «manager» + ДС where уместно. */
export const MANAGER_PAYMENT_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  payment_received: { label: "ДС получены", short: "ДС получены" },
  payment_processing: { label: "В исполнении у провайдера", short: "У провайдера" },
  payment_sent: { label: "Платёж отправлен", short: "Отправлен" },
  manager_checking: { label: "Платёж на уточнении у провайдера", short: "Уточнение" },

  payment_refund_waiting: { label: "Возврат ДС инициирован", short: "Возврат ДС" },
  payment_refund_processing: { label: "Возврат ДС в процессе", short: "Возврат ДС" },
  payment_refund_sent: { label: "Возврат ДС завершён", short: "Возврат завершён" },
};

export const MANAGER_PAYMENT_ACTION_LABELS: Record<string, ActionCopy> = {
  mgr_payment_received: {
    label: "Подтвердить получение ДС",
    confirm: "Подтвердить поступление денежных средств от клиента?",
  },
  mgr_assign_provider: {
    label: "Назначить провайдера исполнения",
    confirm: "Назначить провайдера для исполнения платежа по сделке?",
  },
  mgr_assign_deadline: {
    label: "Установить срок исполнения",
    confirm: "Зафиксировать срок исполнения платежа провайдером?",
  },
  mgr_refund_init: {
    label: "Инициировать возврат ДС",
    confirm: "Инициировать возврат денежных средств клиенту? Проверьте сумму и валюту.",
  },
  mgr_refund_start: {
    label: "Запустить возврат ДС",
    confirm: "Передать возврат денежных средств в исполнение?",
  },
  mgr_refund_file: { label: "Прикрепить подтверждение возврата ДС" },
  mgr_refund_sent: {
    label: "Подтвердить возврат ДС",
    confirm: "Подтвердить, что денежные средства возвращены клиенту?",
  },
  mgr_refund_stop: { label: "Приостановить возврат ДС" },
  mgr_refund_cancel: {
    label: "Отменить возврат ДС",
    confirm: "Отменить процесс возврата и вернуть сделку к этапу после поручения?",
  },
};

const MANAGER_PAYMENT_ACTION_STATUS_LABELS: Partial<
  Record<FormStatus, Partial<Record<string, ActionCopy>>>
> = {
  payment_received: {
    mgr_payment_start: {
      label: "Передать в исполнение",
      confirm: "Передать платёж провайдеру на исполнение?",
    },
  },
  manager_checking: {
    mgr_payment_start: {
      label: "Вернуть в исполнение",
      confirm: "Снова передать платёж провайдеру на исполнение?",
    },
  },
};

export const MANAGER_PAYMENT_ACTION_PANEL = {
  providerLabel: "Провайдер исполнения",
  providerPlaceholder: "Выберите провайдера для исполнения платежа",
  deadlineLabel: "Срок исполнения платежа",
  refundAmountLabel: "Сумма возврата ДС",
  refundCurrencyLabel: "Валюта возврата",
  refundReasonLabel: "Основание возврата ДС",
  refundReasonPlaceholder: "Укажите причину возврата денежных средств клиенту",
};

export const MANAGER_PAYMENT_PROVIDER_LOCK =
  "Назначьте провайдера исполнения — без этого платёж не передать в работу.";

export const MANAGER_REFUND_PANEL = {
  title: "Возврат денежных средств",
  demoHint: "Действия по возврату ДС — в панели «Сопровождение: платёж и возврат».",
  refundStatusLabel: "Статус возврата ДС",
  refundAmountLabel: "Сумма возврата ДС",
  receivedLabel: "Получено от клиента",
  commentLabel: "Комментарий",
  blockCancel:
    "Отмена сделки заблокирована: ДС ещё не возвращены клиенту. Завершите возврат или отмените процесс возврата.",
  afterRefund: "После возврата ДС сделку можно отменить или закрыть.",
  apiStatusLabels: {
    payment_refund_waiting: "Ожидает запуска возврата ДС",
    payment_refund_processing: "Возврат ДС в процессе",
    payment_refund_sent: "ДС возвращены клиенту",
  } as Record<string, string>,
};

export const MANAGER_PAYMENT_FORM_DETAIL = {
  actionPanelTitle: "Сопровождение: платёж и возврат",
};

export function managerPaymentStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return MANAGER_PAYMENT_STATUS_LABELS[status];
}

export function applyManagerPaymentActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return actions.map((action) => {
    const statusCopy = MANAGER_PAYMENT_ACTION_STATUS_LABELS[status]?.[action.id];
    const copy = statusCopy ?? MANAGER_PAYMENT_ACTION_LABELS[action.id];
    if (!copy) return action;
    return {
      ...action,
      label: copy.label,
      confirm: copy.confirm ?? action.confirm,
    };
  });
}

export function isManagerPaymentPhaseStatus(status: FormStatus): boolean {
  return status in MANAGER_PAYMENT_STATUS_LABELS;
}

export function managerPaymentReasonFields(
  actionId: string,
): { label: string; placeholder: string } | undefined {
  if (actionId === "mgr_refund_init") {
    return {
      label: MANAGER_PAYMENT_ACTION_PANEL.refundReasonLabel,
      placeholder: MANAGER_PAYMENT_ACTION_PANEL.refundReasonPlaceholder,
    };
  }
  return undefined;
}
