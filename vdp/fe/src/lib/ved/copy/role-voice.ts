import type { VedRole } from "../types";

/** Dashboard subtitle per role. User voice from glossariy-po-rolyam.txt */
export const ROLE_FOCUS: Record<VedRole, string> = {
  user: "Ваши сделки, документы к загрузке и статусы платежей.",
  internal_compliance_officer: "Проверка организаций и заявок перед запуском сделки.",
  compliance_officer: "Внешняя проверка заявок и подтверждение условий сделки.",
  manager: "Договоры, поручения, платежи и отгрузка по всем сделкам.",
  provider: "Сделки, переданные в исполнение платежа (без данных клиента).",
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

export const ICO_DASHBOARD = {
  incomingForms: "Входящие на проверку",
  orgsPending: "Организации на верификации",
  orgsCleared: "Организации верифицированы",
  tasksTitle: "Заявки в вашей очереди",
  tasksLink: "Вся очередь →",
  tasksEmpty: "Очередь пуста — новых заявок на проверку нет.",
};

export const ICO_FORMS_LIST = {
  title: "Входящие на проверку",
  subtitle: (count: number) => `Очередь внутреннего комплаенса · заявок: ${count}`,
  emptyFilter: "Нет заявок под выбранный фильтр.",
};

export const ICO_ORGANIZATIONS = {
  title: "Проверка организаций",
  subtitle: (pending: number, cleared: number) =>
    `На верификации: ${pending} · верифицировано: ${cleared}`,
  tabPending: (count: number) => `На верификации (${count})`,
  tabCleared: (count: number) => `Верифицированы (${count})`,
  pendingFormsTitle: "Заявки организаций на верификации",
  pendingFormsEmpty: "Все организации по активным заявкам верифицированы.",
};

export const ICO_FORM_DETAIL = {
  lockNote: "Организация заблокирована — проверка заявки недоступна.",
  lockAcceptNote: "Участники не верифицированы — одобрение заявки недоступно.",
  orgPendingNote: "Сначала завершите верификацию организации, затем возьмите заявку в проверку.",
  backToQueue: "Вернуться в очередь",
};

export const ICO_SUBJECT_REVIEW = {
  title: "Верификация участников сделки",
  hint: "Блокировка организации останавливает новые заявки и проверку текущих. Одобрение открывает путь к внешнему комплаенсу.",
  empty: "Участники не указаны в заявке.",
  markLabel: "Отметка проверки",
  noteLabel: "Комментарий для клиента",
  notePlaceholder: "Какие сведения или документы нужны по организации",
  clientHint: "В заявке будет показано:",
  verdicts: {
    approved: { label: "Одобрить", title: "Одобрить участника" },
    waiting_verification: { label: "Запросить документы", title: "Запросить сведения по участнику" },
    blocked: { label: "Заблокировать", title: "Заблокировать организацию" },
  },
};

export const ICO_STATUS_FILTERS: Partial<Record<string, string>> = {
  new: "Новые и черновики",
  compliance: "Верификация и проверка",
  corrections: "На доработке у клиента",
};

export const ECO_DASHBOARD = {
  incomingForms: "Входящие на проверку",
  orgsPending: "Организации на проверке",
  orgsCleared: "Организации проверены",
  tasksTitle: "Сделки в вашей очереди",
  tasksLink: "Вся очередь →",
  tasksEmpty: "Нет сделок, ожидающих внешней проверки.",
};

export const ECO_FORMS_LIST = {
  title: "Входящие на проверку",
  subtitle: (count: number) => `Очередь внешнего комплаенса · сделок: ${count}`,
  emptyFilter: "Нет сделок под выбранный фильтр.",
};

export const ECO_FORM_DETAIL = {
  actionPanelTitle: "Рассмотрение сделки",
  lockNote: "Организация заблокирована — проверка сделки недоступна.",
  lockAcceptNote: "Участники не проверены — подтверждение условий сделки недоступно.",
  backToQueue: "Вернуться в очередь",
  correctionsPending: "Ожидается доработка от клиента",
};

export const ECO_SUBJECT_REVIEW = {
  title: "Участники сделки",
  hint: "Проверьте соответствие организации и контрагента условиям сделки. Блокировка останавливает подтверждение.",
  empty: "Участники не указаны в заявке.",
  markLabel: "Отметка по документам",
  noteLabel: "Комментарий для клиента",
  notePlaceholder: "Какие документы или сведения нужны по сделке",
  clientHint: "Клиент увидит:",
  verdicts: {
    approved: { label: "Соответствует", title: "Подтвердить участника" },
    waiting_verification: { label: "Запросить документы", title: "Запросить документы по сделке" },
    blocked: { label: "Заблокировать", title: "Заблокировать участника" },
  },
};

export const ECO_ACTION_PANEL = {
  title: "Рассмотрение сделки",
  empty: "На этом статусе для вашей роли действий нет — сделка у другого участника процесса.",
  markLabel: "Категория замечания",
  markHint: "Клиент увидит отметку:",
  reasonLabel: "Что исправить клиенту",
  reasonPlaceholder: "Укажите документ или поле; клиент увидит это в заявке и сможет отправить исправления",
  rejectConfirm: (formNumber: string) =>
    `Сделка ${formNumber}. Клиент получит замечание и сможет отправить исправления.`,
};

export const USER_CORRECTIONS_BANNER = {
  title: "Нужны исправления по заявке",
  markPrefix: "Замечание комплаенса:",
  nextStep: "Исправьте указанное и отправьте заявку повторно — кнопка «Отправить исправления» справа.",
};

export const ECO_STATUS_FILTERS: Partial<Record<string, string>> = {
  compliance: "Проверка сделки",
  corrections: "На доработке у клиента",
};

export function statusFilterLabelForRole(filterValue: string, defaultLabel: string, role?: VedRole): string {
  if (role === "user") return USER_STATUS_FILTERS[filterValue] ?? defaultLabel;
  if (role === "internal_compliance_officer") return ICO_STATUS_FILTERS[filterValue] ?? defaultLabel;
  if (role === "compliance_officer") return ECO_STATUS_FILTERS[filterValue] ?? defaultLabel;
  return defaultLabel;
}
