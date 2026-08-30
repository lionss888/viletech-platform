import type { VedRole } from "../types";

const USER_NAV: Partial<Record<string, string>> = {
  "/forms": "Мои заявки",
  "/forms/new": "Новая заявка",
  "/documents": "Документы по сделкам",
  "/counterparties": "Контрагенты",
};

const ICO_NAV: Partial<Record<string, string>> = {
  "/forms": "Входящие на проверку",
  "/organizations": "Проверка организаций",
};

const ECO_NAV: Partial<Record<string, string>> = {
  "/forms": "Входящие на проверку",
  "/organizations": "Проверка организаций",
};

export function navLabelForRole(segment: string, defaultLabel: string, role?: VedRole): string {
  if (role === "user") return USER_NAV[segment] ?? defaultLabel;
  if (role === "internal_compliance_officer") return ICO_NAV[segment] ?? defaultLabel;
  if (role === "compliance_officer") return ECO_NAV[segment] ?? defaultLabel;
  return defaultLabel;
}
