/** Справочники платформы и системные метрики для кабинета суперадмина. */

export type ProviderRecord = {
  id: string;
  name: string;
  country: string;
  corridors: string;
  contact: string;
  slaHours: number;
  status: "active" | "paused";
};

export type CurrencyRecord = {
  code: string;
  title: string;
  rate: string;
  status: "active" | "restricted";
};

export type HsCodeRecord = {
  code: string;
  title: string;
  duty: string;
  license: boolean;
};

export type CountryRecord = {
  code: string;
  title: string;
  risk: "low" | "medium" | "high";
};

export type SystemService = {
  id: string;
  name: string;
  state: "up" | "degraded" | "down";
  latencyMs: number;
  uptime: string;
};

export type SystemIncident = {
  id: string;
  title: string;
  severity: "critical" | "warning";
  account: string;
  at: string;
};

export const PROVIDERS: ProviderRecord[] = [
  { id: "pr-1", name: "Sunrise Payments Ltd", country: "Гонконг", corridors: "CNY, USD", contact: "ops@sunrise-pay.hk", slaHours: 24, status: "active" },
  { id: "pr-2", name: "Bosphorus Settlement", country: "Турция", corridors: "TRY, EUR", contact: "settle@bosphorus.tr", slaHours: 36, status: "active" },
  { id: "pr-3", name: "Gulf Transfer DMCC", country: "ОАЭ", corridors: "AED, USD", contact: "desk@gulftransfer.ae", slaHours: 18, status: "active" },
  { id: "pr-4", name: "Central Asia Clearing", country: "Казахстан", corridors: "KZT, USD", contact: "clearing@cac.kz", slaHours: 48, status: "paused" },
];

export const CURRENCIES: CurrencyRecord[] = [
  { code: "USD", title: "Доллар США", rate: "81,40 ₽", status: "active" },
  { code: "CNY", title: "Юань", rate: "11,25 ₽", status: "active" },
  { code: "AED", title: "Дирхам ОАЭ", rate: "22,16 ₽", status: "active" },
  { code: "TRY", title: "Турецкая лира", rate: "2,04 ₽", status: "restricted" },
  { code: "EUR", title: "Евро", rate: "94,80 ₽", status: "active" },
  { code: "KZT", title: "Тенге", rate: "0,17 ₽", status: "restricted" },
];

export const HS_CODES: HsCodeRecord[] = [
  { code: "8471300000", title: "Вычислительная техника портативная", duty: "0 %", license: false },
  { code: "8517620000", title: "Оборудование связи", duty: "5 %", license: true },
  { code: "8429520001", title: "Экскаваторы полноповоротные", duty: "5 %", license: false },
  { code: "0902300000", title: "Чай чёрный фасованный", duty: "12,5 %", license: false },
  { code: "3004900002", title: "Лекарственные средства", duty: "3 %", license: true },
  { code: "7308900000", title: "Металлоконструкции", duty: "7,5 %", license: false },
];

export const COUNTRIES: CountryRecord[] = [
  { code: "CN", title: "Китай", risk: "low" },
  { code: "TR", title: "Турция", risk: "medium" },
  { code: "AE", title: "ОАЭ", risk: "low" },
  { code: "VN", title: "Вьетнам", risk: "medium" },
  { code: "KZ", title: "Казахстан", risk: "low" },
  { code: "IR", title: "Иран", risk: "high" },
];

export const SYSTEM_SERVICES: SystemService[] = [
  { id: "svc-api", name: "Ядро платформы", state: "up", latencyMs: 118, uptime: "99,98 %" },
  { id: "svc-docs", name: "Распознавание документов", state: "degraded", latencyMs: 940, uptime: "98,70 %" },
  { id: "svc-pay", name: "Шина платежей", state: "up", latencyMs: 240, uptime: "99,91 %" },
  { id: "svc-mail", name: "Уведомления", state: "down", latencyMs: 0, uptime: "94,20 %" },
];

export const SYSTEM_INCIDENTS: SystemIncident[] = [
  { id: "inc-1", title: "Ошибка входа: заблокированный аккаунт повторяет попытки", severity: "critical", account: "salimov@technosnab.ru", at: "сегодня, 12:40" },
  { id: "inc-2", title: "Не доставлены уведомления по 6 заявкам", severity: "critical", account: "manager2@bdui.local", at: "сегодня, 11:02" },
  { id: "inc-3", title: "Инвойс не распознан, требуется ручной ввод", severity: "warning", account: "lebedeva@baltictrade.ru", at: "вчера, 18:15" },
  { id: "inc-4", title: "Провайдер не подтвердил платёж в SLA", severity: "warning", account: "provider2@bdui.local", at: "вчера, 09:30" },
];

export type ComplianceToolRecord = {
  id: string;
  code: string;
  title: string;
  instruction: string;
  scope: "form" | "organization" | "both";
  active: boolean;
};

/** «Инструменты комплаенс»: отметки возврата на доработку, которыми управляет суперадмин. */
export const COMPLIANCE_TOOLS: ComplianceToolRecord[] = [
  { id: "ct-1", code: "DOC-INVOICE", title: "Некорректный инвойс", instruction: "Загрузите инвойс с подписью и печатью поставщика, суммы должны совпадать с заявкой.", scope: "form", active: true },
  { id: "ct-2", code: "DOC-CONTRACT", title: "Нет внешнеторгового контракта", instruction: "Приложите контракт с контрагентом со всеми приложениями и спецификациями.", scope: "form", active: true },
  { id: "ct-3", code: "HS-MISMATCH", title: "Код ТН ВЭД не соответствует товару", instruction: "Уточните код ТН ВЭД по описанию товара в инвойсе.", scope: "form", active: true },
  { id: "ct-4", code: "AMOUNT-MISMATCH", title: "Расхождение суммы платежа", instruction: "Приведите сумму заявки в соответствие с инвойсом и условиями оплаты.", scope: "form", active: true },
  { id: "ct-5", code: "ORG-DOCS", title: "Не хватает документов организации", instruction: "Предоставьте устав, решение о назначении руководителя и карточку с реквизитами.", scope: "organization", active: true },
  { id: "ct-6", code: "ORG-UBO", title: "Не раскрыта структура владения", instruction: "Предоставьте сведения о бенефициарных владельцах организации.", scope: "organization", active: true },
  { id: "ct-7", code: "ORG-BANK", title: "Не подтверждены банковские реквизиты", instruction: "Приложите справку банка с реквизитами счёта и SWIFT.", scope: "organization", active: true },
  { id: "ct-8", code: "SANCTION-RISK", title: "Санкционный риск", instruction: "Требуется пояснение по маршруту платежа и составу участников сделки.", scope: "both", active: true },
  { id: "ct-9", code: "DATA-QUALITY", title: "Данные заполнены неполно", instruction: "Проверьте и дозаполните обязательные поля заявки и карточек участников.", scope: "both", active: true },
];
