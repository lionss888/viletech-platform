import type { VedRole } from "../types";

const USER_NAV: Partial<Record<string, string>> = {
  "/forms": "Мои заявки",
  "/forms/new": "Новая заявка",
  "/documents": "Документы по сделкам",
  "/counterparties": "Контрагенты",
};

export function navLabelForRole(segment: string, defaultLabel: string, role?: VedRole): string {
  if (role !== "user") return defaultLabel;
  return USER_NAV[segment] ?? defaultLabel;
}
