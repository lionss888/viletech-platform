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

import {
  buildComplianceToolSeed,
  buildCountrySeed,
  buildCurrencySeed,
  buildHsCodeSeed,
  buildProviderSeed,
} from "./reference-seed";

export const PROVIDERS: ProviderRecord[] = buildProviderSeed();

export const CURRENCIES: CurrencyRecord[] = buildCurrencySeed();

export const HS_CODES: HsCodeRecord[] = buildHsCodeSeed();

export const COUNTRIES: CountryRecord[] = buildCountrySeed();

export const SYSTEM_SERVICES: SystemService[] = [
  { id: "svc-api", name: "Ядро платформы", state: "up", latencyMs: 118, uptime: "99,98 %" },
  { id: "svc-docs", name: "Распознавание документов", state: "degraded", latencyMs: 940, uptime: "98,70 %" },
  { id: "svc-pay", name: "Шина платежей", state: "up", latencyMs: 240, uptime: "99,91 %" },
  { id: "svc-mail", name: "Уведомления", state: "down", latencyMs: 0, uptime: "94,20 %" },
];

export const SYSTEM_INCIDENTS: SystemIncident[] = [
  { id: "inc-1", title: "Ошибка входа: заблокированный аккаунт повторяет попытки", severity: "critical", account: "salimov@technosnab.ru", at: "сегодня, 12:40" },
  { id: "inc-2", title: "Не доставлены уведомления по 6 заявкам", severity: "critical", account: "manager2@demo.vdp.local", at: "сегодня, 11:02" },
  { id: "inc-3", title: "Инвойс не распознан, требуется ручной ввод", severity: "warning", account: "lebedeva@baltictrade.ru", at: "вчера, 18:15" },
  { id: "inc-4", title: "Провайдер не подтвердил платёж в SLA", severity: "warning", account: "provider2@demo.vdp.local", at: "вчера, 09:30" },
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
export const COMPLIANCE_TOOLS: ComplianceToolRecord[] = buildComplianceToolSeed();
