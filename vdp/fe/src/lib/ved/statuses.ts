import { ecoStatusLabel, icoStatusLabel, userStatusLabel } from "./copy/status-labels";
import { managerCloseStatusLabel } from "./copy/manager-close-copy";
import { managerContractStatusLabel } from "./copy/manager-contract-copy";
import { managerPaymentStatusLabel } from "./copy/manager-payment-copy";
import { providerStatusLabel } from "./copy/provider-copy";
import type { FormStatus, StageId, StatusTone, VedRole } from "./types";

export type StatusMeta = {
  label: string;
  short: string;
  tone: StatusTone;
  stage: StageId;
};

/** Полный перечень FormPaymentStatus из backend-for-ved (form-payment.enums.ts). */
export const STATUS_META: Record<string, StatusMeta> = {
  creating: { label: "Создаётся, идёт распознавание", short: "Создаётся", tone: "work", stage: "new" },
  draft: { label: "Черновик", short: "Черновик", tone: "neutral", stage: "new" },

  organization_waiting_verification: {
    label: "Ожидает проверки организации",
    short: "Ожидание ВКО",
    tone: "wait",
    stage: "organization_verification",
  },
  organization_verification: {
    label: "Внутренний комплаенс проверяет организацию",
    short: "Проверка ВКО",
    tone: "work",
    stage: "organization_verification",
  },

  form_waiting_verification: {
    label: "Ожидает проверки комплаенса",
    short: "Ожидание КО",
    tone: "wait",
    stage: "form_verification",
  },
  form_verification: {
    label: "Комплаенс проверяет заявку",
    short: "Проверка КО",
    tone: "work",
    stage: "form_verification",
  },
  form_waiting_corrections: {
    label: "Возвращена на коррекцию",
    short: "Коррекция",
    tone: "return",
    stage: "form_verification",
  },
  form_accepted: { label: "Заявка подтверждена", short: "Подтверждена", tone: "done", stage: "form_verification" },

  contract_waiting: {
    label: "Ожидает подписанный агентский договор",
    short: "Ожидание договора",
    tone: "wait",
    stage: "agency_contract",
  },
  contract_waiting_correction: {
    label: "Договор на коррекции",
    short: "Коррекция договора",
    tone: "return",
    stage: "agency_contract",
  },
  contract_verification: {
    label: "Договор на проверке менеджером",
    short: "Проверка договора",
    tone: "work",
    stage: "agency_contract",
  },

  signing_order: { label: "Поручение отправлено на подпись", short: "Подпись поручения", tone: "wait", stage: "signing_order" },
  signing_order_waiting_verification: {
    label: "Поручение ожидает проверки менеджером",
    short: "Проверка поручения",
    tone: "wait",
    stage: "signing_order",
  },
  signing_order_waiting_corrections: {
    label: "Поручение на коррекции",
    short: "Коррекция поручения",
    tone: "return",
    stage: "signing_order",
  },
  signing_order_verification: {
    label: "Менеджер проверяет поручение",
    short: "Проверка поручения",
    tone: "work",
    stage: "signing_order",
  },
  signing_order_accepted: { label: "Поручение подтверждено", short: "Поручение принято", tone: "done", stage: "signing_order" },

  advance_signing_order: {
    label: "Доп. поручение на подпись",
    short: "Доп. поручение",
    tone: "wait",
    stage: "signing_order",
  },
  advance_signing_order_waiting_verification: {
    label: "Доп. поручение ожидает проверки",
    short: "Доп. поручение",
    tone: "wait",
    stage: "signing_order",
  },
  advance_signing_order_waiting_corrections: {
    label: "Доп. поручение на коррекции",
    short: "Коррекция",
    tone: "return",
    stage: "signing_order",
  },
  advance_signing_order_verification: {
    label: "Проверка доп. поручения",
    short: "Доп. поручение",
    tone: "work",
    stage: "signing_order",
  },
  advance_signing_order_accepted: {
    label: "Доп. поручение подтверждено",
    short: "Доп. поручение",
    tone: "done",
    stage: "signing_order",
  },

  payment_received: { label: "Средства от клиента получены", short: "Средства получены", tone: "work", stage: "payment" },
  payment_processing: { label: "Платёж в исполнении", short: "В исполнении", tone: "work", stage: "payment" },
  payment_sent: { label: "Платёж отправлен контрагенту", short: "Платёж отправлен", tone: "done", stage: "payment" },
  manager_checking: { label: "Возвращена менеджеру на уточнение", short: "Уточнение", tone: "return", stage: "payment" },

  payment_refund_waiting: { label: "Ожидается возврат средств", short: "Возврат", tone: "wait", stage: "payment" },
  payment_refund_processing: { label: "Возврат средств в процессе", short: "Возврат", tone: "work", stage: "payment" },
  payment_refund_sent: { label: "Возврат средств завершён", short: "Возврат", tone: "done", stage: "payment" },

  report_waiting: { label: "Отчёт агента на подписании", short: "Подпись отчёта", tone: "wait", stage: "agent_report" },
  report_waiting_diadoc: { label: "Отчёт отправлен в ЭДО", short: "ЭДО", tone: "wait", stage: "agent_report" },
  report_waiting_verification: {
    label: "Отчёт ожидает проверки менеджером",
    short: "Проверка отчёта",
    tone: "wait",
    stage: "agent_report",
  },
  report_waiting_corrections: { label: "Отчёт на коррекции", short: "Коррекция отчёта", tone: "return", stage: "agent_report" },
  report_verification: { label: "Менеджер проверяет отчёт", short: "Проверка отчёта", tone: "work", stage: "agent_report" },
  report_accepted: { label: "Отчёт подтверждён", short: "Отчёт принят", tone: "done", stage: "agent_report" },

  shipment_waiting: { label: "Ожидаются документы об отгрузке", short: "Ожидание отгрузки", tone: "wait", stage: "shipment" },
  shipment_waiting_verification: {
    label: "Документы об отгрузке на проверке",
    short: "Проверка отгрузки",
    tone: "wait",
    stage: "shipment",
  },
  shipment_waiting_corrections: {
    label: "Документы об отгрузке на коррекции",
    short: "Коррекция отгрузки",
    tone: "return",
    stage: "shipment",
  },
  shipment_verification: { label: "Менеджер проверяет отгрузку", short: "Проверка отгрузки", tone: "work", stage: "shipment" },

  completed: { label: "Заявка закрыта", short: "Завершено", tone: "done", stage: "completed" },
  canceled_by_user: { label: "Отменена клиентом", short: "Отменена", tone: "return", stage: "completed" },
  canceled_by_manager: { label: "Отменена менеджером", short: "Отменена", tone: "return", stage: "completed" },
  canceled_by_compliance_officer: { label: "Отменена комплаенсом", short: "Отменена", tone: "return", stage: "completed" },
  canceled_by_internal_compliance_officer: {
    label: "Отменена внутренним комплаенсом",
    short: "Отменена",
    tone: "return",
    stage: "completed",
  },
};

export function statusMeta(status: FormStatus, role?: VedRole): StatusMeta {
  const base = STATUS_META[status] ?? { label: status, short: status, tone: "neutral" as StatusTone, stage: "new" as StageId };
  if (role === "user") {
    const user = userStatusLabel(status);
    if (user) return { ...base, label: user.label, short: user.short ?? user.label };
  }
  if (role === "internal_compliance_officer") {
    const ico = icoStatusLabel(status);
    if (ico) return { ...base, label: ico.label, short: ico.short ?? ico.label };
  }
  if (role === "compliance_officer") {
    const eco = ecoStatusLabel(status);
    if (eco) return { ...base, label: eco.label, short: eco.short ?? eco.label };
  }
  if (role === "manager") {
    const close = managerCloseStatusLabel(status);
    if (close) return { ...base, label: close.label, short: close.short ?? close.label };
    const payment = managerPaymentStatusLabel(status);
    if (payment) return { ...base, label: payment.label, short: payment.short ?? payment.label };
    const mgr = managerContractStatusLabel(status);
    if (mgr) return { ...base, label: mgr.label, short: mgr.short ?? mgr.label };
  }
  if (role === "provider") {
    const provider = providerStatusLabel(status);
    if (provider) return { ...base, label: provider.label, short: provider.short ?? provider.label };
  }
  return base;
}

export const STAGES: { id: StageId; label: string }[] = [
  { id: "new", label: "Новая" },
  { id: "organization_verification", label: "Организация" },
  { id: "form_verification", label: "Комплаенс" },
  { id: "agency_contract", label: "Договор" },
  { id: "signing_order", label: "Поручение" },
  { id: "payment", label: "Платёж" },
  { id: "agent_report", label: "Отчёт" },
  { id: "shipment", label: "Отгрузка" },
  { id: "completed", label: "Завершено" },
];

/** Опции фильтра списка — сгруппированы по стадии, а не по всем 40+ статусам. */
export const STATUS_FILTERS: { value: string; label: string; statuses: string[] }[] = [
  { value: "all", label: "Все статусы", statuses: [] },
  { value: "new", label: "Черновики", statuses: ["creating", "draft"] },
  {
    value: "compliance",
    label: "На комплаенсе",
    statuses: [
      "organization_waiting_verification",
      "organization_verification",
      "form_waiting_verification",
      "form_verification",
    ],
  },
  { value: "corrections", label: "На коррекции", statuses: Object.keys(STATUS_META).filter((s) => s.includes("corrections") || s.includes("correction")) },
  {
    value: "documents",
    label: "Договор и поручение",
    statuses: Object.keys(STATUS_META).filter((s) => s.startsWith("contract") || s.includes("signing_order")),
  },
  {
    value: "payment",
    label: "Платёж",
    statuses: ["payment_received", "payment_processing", "payment_sent", "manager_checking"],
  },
  {
    value: "closing",
    label: "Закрытие",
    statuses: Object.keys(STATUS_META).filter((s) => s.startsWith("report") || s.startsWith("shipment")),
  },
  { value: "completed", label: "Завершённые", statuses: ["completed"] },
  {
    value: "canceled",
    label: "Отменённые",
    statuses: Object.keys(STATUS_META).filter((s) => s.startsWith("canceled")),
  },
];

export function stageIndex(stage: StageId): number {
  return STAGES.findIndex((item) => item.id === stage);
}
