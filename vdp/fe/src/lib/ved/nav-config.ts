import type { VedRole } from "./types";

export type NavItem = { segment: string; label: string; roles: VedRole[] | "all"; matchExact?: boolean };

export const MAIN_NAV: NavItem[] = [
  { segment: "/dashboard", label: "Рабочий стол", roles: "all" },
  { segment: "/forms", label: "Реестр заявок", roles: ["user", "manager", "provider", "root"] },
  { segment: "/forms", label: "Входящие заявки", roles: ["internal_compliance_officer", "compliance_officer"] },
  { segment: "/organizations", label: "Проверка организаций", roles: ["internal_compliance_officer", "compliance_officer"] },
  { segment: "/forms/new", label: "Новая заявка", roles: ["user", "manager", "root"] },
  { segment: "/chats", label: "Рабочие чаты", roles: "all" },
  { segment: "/profile", label: "Профиль", roles: "all" },
];

export const REFERENCE_NAV: NavItem[] = [
  { segment: "/documents", label: "Документы", roles: ["user", "manager", "provider", "root"] },
  { segment: "/counterparties", label: "Контрагенты", roles: ["user", "manager", "root"] },
  { segment: "/organizations", label: "Организации", roles: ["manager", "root"] },
  { segment: "/compliance-tools", label: "Инструменты комплаенс", roles: ["root"] },
  { segment: "/admin", label: "Пользователи", roles: ["root"] },
  { segment: "/providers", label: "Провайдеры", roles: ["manager", "root"] },
  { segment: "/codes", label: "Коды ТН ВЭД", roles: ["manager", "root"] },
  { segment: "/currencies", label: "Валюты", roles: ["manager", "root"] },
  { segment: "/countries", label: "Страны и риски", roles: ["root"] },
  { segment: "/testing", label: "Проверка сценариев", roles: ["root"] },
];

export function filterNav(items: NavItem[], role: VedRole | undefined): NavItem[] {
  return items.filter((item) => item.roles === "all" || (role && item.roles.includes(role)));
}
