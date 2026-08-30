import type { FormAction, FormStatus } from "../types";
import type { ActionCopy, RoleStatusLabel } from "./status-labels";

/** Provider: payment execution only. No client PII in copy. Source: glossariy-po-rolyam.txt */
export const PROVIDER_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  payment_received: { label: "Платёж передан в исполнение", short: "К исполнению" },
  payment_processing: { label: "Платёж в работе", short: "В работе" },
  payment_sent: { label: "Платёж отправлен", short: "Отправлен" },
};

export const PROVIDER_ACTION_LABELS: Record<string, ActionCopy> = {
  prov_payment_start: {
    label: "Начать исполнение платежа",
    confirm: "Принять платёж в работу и перейти к исполнению по реквизитам?",
  },
  prov_attach_proof: { label: "Прикрепить подтверждение (платёжка/хеш)" },
  prov_payment_sent: {
    label: "Подтвердить отправку платежа",
    confirm: "Подтвердить, что платёж отправлен контрагенту по указанным реквизитам?",
  },
  prov_payment_return: {
    label: "Вернуть на уточнение менеджеру",
    confirm: "Вернуть платёж менеджеру на уточнение? Передаются только реквизиты и сумма.",
  },
};

export const PROVIDER_ACTION_PANEL = {
  proofHashLabel: "Хеш транзакции (crypto)",
  proofHashPlaceholder: "0x… или txid",
  proofHashHint: "Для fiat — прикрепите платёжное поручение ниже.",
  proofFileLabel: "Подтверждение платежа",
  returnReasonLabel: "Что уточнить у менеджера",
  returnReasonPlaceholder:
    "Опишите вопрос по реквизитам, сумме или назначению платежа — без персональных данных",
};

export const PROVIDER_FORM_DETAIL = {
  actionPanelTitle: "Исполнение платежа",
  requisitesTitle: "Реквизиты для исполнения платежа",
  documentsTitle: "Документы платежа",
  documentsEmpty: "Прикрепите подтверждение через действие на карточке.",
  timelineEmpty: "События появятся после действий по платежу.",
};

export const PROVIDER_FORMS_LIST = {
  title: "Платежи в исполнении",
  subtitle: (count: number) => `Переданные вам платежи · ${count}`,
  searchPlaceholder: "Поиск: номер, инвойс, контрагент, организация",
  emptyRegistry: "Платежей в исполнении пока нет — они появятся после назначения менеджером.",
  emptyFilter: "Нет платежей под текущий фильтр. Сбросьте фильтры или измените поиск.",
  counterActionRequired: "Требуют исполнения",
  counterInPayment: "В платеже",
  counterActiveSum: "Сумма в исполнении",
  counterClosed: "Завершено",
};

export const PROVIDER_DASHBOARD = {
  actionRequired: "Требуют исполнения",
  activePayments: "Платежей в работе",
  activeSum: "Сумма в исполнении",
  completed: "Завершено",
  tasksTitle: "Платежи, требующие действия",
  tasksLink: "Все платежи →",
  tasksEmpty: "Нет платежей, ожидающих вашего шага.",
  stagesTitle: "Платежи по этапам",
};

export const PROVIDER_NAV: Partial<Record<string, string>> = {
  "/forms": "Платежи в исполнении",
  "/documents": "Документы платежа",
};

/** Terms that must not appear in provider-facing copy (ACL guard for tests). */
export const PROVIDER_FORBIDDEN_COPY_TERMS = ["Клиент", "клиент", "ownerName", "ФИО", "паспорт"] as const;

export function providerStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return PROVIDER_STATUS_LABELS[status];
}

export function applyProviderActionLabels(actions: FormAction[]): FormAction[] {
  return actions.map((action) => {
    const copy = PROVIDER_ACTION_LABELS[action.id];
    if (!copy) return action;
    return {
      ...action,
      label: copy.label,
      confirm: copy.confirm ?? action.confirm,
    };
  });
}

export function providerReasonFields(actionId: string): { label: string; placeholder: string } | undefined {
  if (actionId === "prov_payment_return") {
    return {
      label: PROVIDER_ACTION_PANEL.returnReasonLabel,
      placeholder: PROVIDER_ACTION_PANEL.returnReasonPlaceholder,
    };
  }
  return undefined;
}

export function collectProviderCopyStrings(): string[] {
  const buckets: string[] = [
    ...Object.values(PROVIDER_STATUS_LABELS).flatMap((v) => (v ? [v.label, v.short ?? ""] : [])),
    ...Object.values(PROVIDER_ACTION_LABELS).flatMap((v) => [v.label, v.confirm ?? ""]),
    ...Object.values(PROVIDER_ACTION_PANEL),
    ...Object.values(PROVIDER_FORM_DETAIL),
    ...Object.values(PROVIDER_FORMS_LIST).flatMap((v) => (typeof v === "function" ? [v(0)] : [v])),
    ...Object.values(PROVIDER_DASHBOARD),
    ...Object.values(PROVIDER_NAV),
  ];
  return buckets.filter(Boolean);
}
