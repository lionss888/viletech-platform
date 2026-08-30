import type { FormAction, FormStatus } from "../types";
import type { ActionCopy, RoleStatusLabel } from "./status-labels";

/** Manager: contract & order phase (form_accepted → signing_order_accepted). Glossary column «manager». */
export const MANAGER_CONTRACT_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  form_accepted: { label: "Готова к сопровождению", short: "К сопровождению" },
  form_waiting_corrections: { label: "На коррекции у клиента", short: "Коррекция" },

  contract_waiting: { label: "Ждём договор от клиента", short: "Ожидание договора" },
  contract_waiting_correction: { label: "Договор на доработке у клиента", short: "Коррекция договора" },
  contract_verification: { label: "Агентский договор на проверке", short: "Проверка договора" },

  signing_order: { label: "Поручение на подписи у клиента", short: "Подпись поручения" },
  signing_order_waiting_verification: {
    label: "Поручение в очереди на проверку",
    short: "Очередь поручения",
  },
  signing_order_waiting_corrections: {
    label: "Поручение на доработке у клиента",
    short: "Коррекция поручения",
  },
  signing_order_verification: { label: "Поручение принципала на проверке", short: "Проверка поручения" },
  signing_order_accepted: { label: "Поручение принято", short: "Поручение принято" },

  advance_signing_order: { label: "Доп. поручение на подписи у клиента", short: "Доп. поручение" },
  advance_signing_order_waiting_verification: {
    label: "Доп. поручение в очереди на проверку",
    short: "Очередь доп. поручения",
  },
  advance_signing_order_waiting_corrections: {
    label: "Доп. поручение на доработке у клиента",
    short: "Коррекция доп. поручения",
  },
  advance_signing_order_verification: {
    label: "Доп. поручение на проверке",
    short: "Проверка доп. поручения",
  },
  advance_signing_order_accepted: { label: "Доп. поручение принято", short: "Доп. поручение принято" },
};

export const MANAGER_CONTRACT_ACTION_LABELS: Record<string, ActionCopy> = {
  mgr_assign_agent: {
    label: "Назначить агента по сделке",
    confirm: "Назначить платёжного агента по этой сделке?",
  },
  mgr_contract_attach: { label: "Прикрепить агентский договор" },
  mgr_contract_return: {
    label: "Вернуть договор на доработку клиенту",
    confirm: "Вернуть договор клиенту? Клиент загрузит исправленную версию.",
  },
  mgr_order_generate: {
    label: "Сформировать поручение принципала",
    confirm: "Сформировать поручение и отправить клиенту на подпись?",
  },
  mgr_order_attach: { label: "Загрузить поручение принципала" },
  mgr_order_start: { label: "Взять поручение в проверку" },
  mgr_order_accept: {
    label: "Принять поручение принципала",
    confirm: "Подтвердить подписанное поручение? Далее — этап получения средств.",
  },
  mgr_order_reject: {
    label: "Вернуть поручение на доработку",
    confirm: "Вернуть поручение клиенту на доработку?",
  },
  mgr_order_stop: { label: "Вернуть поручение в очередь" },
  mgr_order_advance_start: { label: "Взять доп. поручение в проверку" },
  mgr_order_advance_accept: {
    label: "Принять доп. поручение принципала",
    confirm: "Подтвердить подписанное доп. поручение?",
  },
  mgr_order_advance_reject: { label: "Вернуть доп. поручение на доработку" },
  mgr_order_advance_stop: { label: "Вернуть доп. поручение в очередь" },
  mgr_advance_signing: { label: "Сформировать доп. поручение принципала" },
  mgr_form_reject: {
    label: "Вернуть сделку на коррекцию клиенту",
    confirm: "Вернуть сделку клиенту на доработку?",
  },
};

const MANAGER_CONTRACT_ACTION_STATUS_LABELS: Partial<
  Record<FormStatus, Partial<Record<string, ActionCopy>>>
> = {
  contract_waiting: {
    mgr_contract_confirm: { label: "Проверить загруженный договор" },
  },
  contract_verification: {
    mgr_contract_confirm: {
      label: "Подтвердить агентский договор",
      confirm: "Подтвердить договор и перейти к поручению принципала?",
    },
  },
};

export const MANAGER_CONTRACT_ACTION_PANEL = {
  assignAgentLabel: "Платёжный агент по сделке",
  assignAgentPlaceholder: "Выберите агента для сопровождения сделки",
  contractAttachLabel: "Тип агентского договора",
  contractReturnReason: "Что исправить в договоре",
  contractReturnPlaceholder: "Укажите, что клиенту нужно изменить в договоре или приложить",
  orderRejectReason: "Что исправить в поручении",
  orderRejectPlaceholder: "Укажите замечания по поручению принципала для клиента",
  formRejectReason: "Что исправить по сделке",
  formRejectPlaceholder: "Клиент увидит комментарий и сможет отправить исправления",
};

export const MANAGER_CONTRACT_FORM_DETAIL = {
  actionPanelTitle: "Сопровождение: договор и поручение",
};

export function managerContractStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return MANAGER_CONTRACT_STATUS_LABELS[status];
}

export function applyManagerContractActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return actions.map((action) => {
    const statusCopy = MANAGER_CONTRACT_ACTION_STATUS_LABELS[status]?.[action.id];
    const copy = statusCopy ?? MANAGER_CONTRACT_ACTION_LABELS[action.id];
    if (!copy) return action;
    return {
      ...action,
      label: copy.label,
      confirm: copy.confirm ?? action.confirm,
    };
  });
}

export function isManagerContractPhaseStatus(status: FormStatus): boolean {
  return status in MANAGER_CONTRACT_STATUS_LABELS;
}

export function managerContractReasonFields(
  actionId: string,
): { label: string; placeholder: string } | undefined {
  if (actionId === "mgr_contract_return") {
    return {
      label: MANAGER_CONTRACT_ACTION_PANEL.contractReturnReason,
      placeholder: MANAGER_CONTRACT_ACTION_PANEL.contractReturnPlaceholder,
    };
  }
  if (actionId === "mgr_order_reject" || actionId === "mgr_order_advance_reject") {
    return {
      label: MANAGER_CONTRACT_ACTION_PANEL.orderRejectReason,
      placeholder: MANAGER_CONTRACT_ACTION_PANEL.orderRejectPlaceholder,
    };
  }
  if (actionId === "mgr_form_reject") {
    return {
      label: MANAGER_CONTRACT_ACTION_PANEL.formRejectReason,
      placeholder: MANAGER_CONTRACT_ACTION_PANEL.formRejectPlaceholder,
    };
  }
  return undefined;
}
