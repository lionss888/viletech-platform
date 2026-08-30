import type { FormStatus } from "../types";

export type RoleStatusLabel = { label: string; short?: string };

/** User-facing status labels (canonical id unchanged). Source: glossariy-po-rolyam.txt */
export const USER_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  creating: { label: "Создаётся заявка", short: "Создаётся" },
  draft: { label: "Черновик заявки", short: "Черновик" },

  organization_waiting_verification: {
    label: "Отправлено на проверку компании",
    short: "Проверка компании",
  },
  organization_verification: { label: "Компания на проверке", short: "Проверка компании" },

  form_waiting_verification: { label: "Заявка на проверке", short: "На проверке" },
  form_verification: { label: "Идёт проверка заявки", short: "Проверка" },
  form_waiting_corrections: { label: "Нужны исправления", short: "Исправления" },
  form_accepted: { label: "Заявка принята", short: "Принята" },

  contract_waiting: { label: "Подпишите агентский договор", short: "Договор" },
  contract_waiting_correction: { label: "Договор на коррекции", short: "Коррекция договора" },
  contract_verification: { label: "Договор на проверке", short: "Проверка договора" },

  signing_order: { label: "Подпишите поручение", short: "Поручение" },
  signing_order_waiting_verification: { label: "Поручение на проверке", short: "Проверка поручения" },
  signing_order_waiting_corrections: { label: "Поручение на коррекции", short: "Коррекция поручения" },
  signing_order_verification: { label: "Поручение на проверке", short: "Проверка поручения" },
  signing_order_accepted: { label: "Поручение принято", short: "Поручение принято" },

  advance_signing_order: { label: "Подпишите доп. поручение", short: "Доп. поручение" },
  advance_signing_order_waiting_verification: { label: "Доп. поручение на проверке", short: "Доп. поручение" },
  advance_signing_order_waiting_corrections: { label: "Доп. поручение на коррекции", short: "Коррекция" },
  advance_signing_order_verification: { label: "Доп. поручение на проверке", short: "Доп. поручение" },
  advance_signing_order_accepted: { label: "Доп. поручение принято", short: "Доп. поручение" },

  payment_received: { label: "Средства получены оператором", short: "Средства получены" },
  payment_processing: { label: "Платёж исполняется", short: "В исполнении" },
  payment_sent: { label: "Платёж отправлен", short: "Платёж отправлен" },
  manager_checking: { label: "Платёж на уточнении", short: "Уточнение" },

  payment_refund_waiting: { label: "Ожидается возврат", short: "Возврат" },
  payment_refund_processing: { label: "Возврат в процессе", short: "Возврат" },
  payment_refund_sent: { label: "Возврат завершён", short: "Возврат" },

  report_waiting: { label: "Подпишите отчёт агента", short: "Отчёт" },
  report_waiting_diadoc: { label: "Отчёт в ЭДО", short: "ЭДО" },
  report_waiting_verification: { label: "Отчёт на проверке", short: "Проверка отчёта" },
  report_waiting_corrections: { label: "Отчёт на коррекции", short: "Коррекция отчёта" },
  report_verification: { label: "Отчёт на проверке", short: "Проверка отчёта" },
  report_accepted: { label: "Отчёт принят", short: "Отчёт принят" },

  shipment_waiting: { label: "Загрузите документы об отгрузке", short: "Отгрузка" },
  shipment_waiting_verification: { label: "Отгрузка на проверке", short: "Проверка отгрузки" },
  shipment_waiting_corrections: { label: "Документы об отгрузке на коррекции", short: "Коррекция отгрузки" },
  shipment_verification: { label: "Отгрузка на проверке", short: "Проверка отгрузки" },

  completed: { label: "Сделка закрыта", short: "Закрыта" },
  canceled_by_user: { label: "Отменена вами", short: "Отменена" },
  canceled_by_manager: { label: "Отменена оператором", short: "Отменена" },
  canceled_by_compliance_officer: { label: "Отменена комплаенсом", short: "Отменена" },
  canceled_by_internal_compliance_officer: { label: "Отменена комплаенсом", short: "Отменена" },
};

/** Internal CO (ICO) status labels — glossary column «ico». */
export const ICO_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  organization_waiting_verification: {
    label: "В очереди на верификацию организации",
    short: "Очередь ВКО",
  },
  organization_verification: {
    label: "На верификации организации",
    short: "Верификация",
  },
  form_waiting_corrections: {
    label: "Возврат на доработку",
    short: "Доработка",
  },
  form_waiting_verification: {
    label: "Ожидает внешней проверки",
    short: "Передано ECO",
  },
  form_verification: {
    label: "На внешней проверке",
    short: "ECO",
  },
  form_accepted: {
    label: "Сделка подтверждена",
    short: "Подтверждена",
  },
  canceled_by_internal_compliance_officer: {
    label: "Отклонена внутренним комплаенсом",
    short: "Отклонена",
  },
};

export function userStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return USER_STATUS_LABELS[status];
}

export function icoStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return ICO_STATUS_LABELS[status];
}

/** External CO (ECO) status labels — glossary column «eco». */
export const ECO_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  form_waiting_verification: {
    label: "В очереди на проверку сделки",
    short: "Очередь ECO",
  },
  form_verification: {
    label: "На проверке сделки",
    short: "Проверка сделки",
  },
  form_waiting_corrections: {
    label: "Возврат на доработку",
    short: "Доработка",
  },
  form_accepted: {
    label: "Сделка подтверждена",
    short: "Подтверждена",
  },
  canceled_by_compliance_officer: {
    label: "Отклонена внешним комплаенсом",
    short: "Отклонена",
  },
};

export function ecoStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return ECO_STATUS_LABELS[status];
}
