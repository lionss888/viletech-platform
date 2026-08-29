import type { VedRole } from "../types";

/** Dashboard subtitle per role. User voice from glossariy-po-rolyam.txt */
export const ROLE_FOCUS: Record<VedRole, string> = {
  user: "Ваши сделки, документы к загрузке и статусы платежей.",
  internal_compliance_officer: "Проверка организаций и заявок перед запуском сделки.",
  compliance_officer: "Внешняя проверка заявок и подтверждение условий сделки.",
  manager: "Договоры, поручения, платежи и отгрузка по всем сделкам.",
  provider: "Сделки, переданные в исполнение платежа.",
  root: "Состояние системы, критичные ошибки, нагрузка и эффективность команды.",
};

export type UserDashboardCard = { label: string; search: Record<string, string | boolean> };

export const USER_DASHBOARD_CARDS: UserDashboardCard[] = [
  { label: "Требуют вашего действия", search: { mine: true } },
  { label: "Сделок в работе", search: {} },
  { label: "Сумма в работе", search: {} },
  { label: "Сделок закрыто", search: { filter: "completed" } },
];

export const USER_FORMS_LIST = {
  title: "Мои заявки",
  subtitle: (count: number) => `Ваши сделки · заявок: ${count}`,
  emptyRegistry: "У вас пока нет заявок. Создайте первую сделку — укажите контракт, инвойс и валюту.",
  emptyFilter: "Нет заявок под выбранный фильтр. Сбросьте фильтры или создайте новую заявку.",
  tasksEmpty: "Сейчас нет заявок, требующих вашего участия.",
  tasksLink: "Все мои заявки →",
  backToRegistry: "Вернуться к моим заявкам",
};

export const USER_WIZARD = {
  title: "Новая заявка на сопровождение сделки",
  subtitle: "Укажите условия контракта, инвойса и валюты — черновик сохранится в ядре.",
  steps: ["Направление сделки", "Стороны", "Контракт и инвойс", "Документы", "Проверка заявки"],
  noDocuments: "Документов пока нет — укажу реквизиты контракта вручную",
  noDocumentsActive: "✓ Документов пока нет — реквизиты контракта вручную",
};

export const USER_STATUS_FILTERS: Partial<Record<string, string>> = {
  compliance: "На проверке",
  documents: "Договор и поручение",
  closing: "Отчёт и отгрузка",
};

export function statusFilterLabelForUser(filterValue: string, defaultLabel: string, role?: VedRole): string {
  if (role !== "user") return defaultLabel;
  return USER_STATUS_FILTERS[filterValue] ?? defaultLabel;
}
