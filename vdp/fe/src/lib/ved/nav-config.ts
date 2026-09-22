import type { VedRole } from "./types";

export type NavItem = { segment: string; label: string; roles: VedRole[] | "all"; matchExact?: boolean };

/** Nested group under «Справочники» (manager / root). */
export type NavGroup = {
  id: string;
  label: string;
  roles: VedRole[];
  items: NavItem[];
};

/** Exported constant: MAIN_NAV. */
export const MAIN_NAV: NavItem[] = [
  { segment: "/dashboard", label: "Рабочий стол", roles: "all" },
  { segment: "/forms", label: "Реестр заявок", roles: ["user", "manager", "treasurer", "provider", "root"] },
  { segment: "/forms", label: "Входящие заявки", roles: ["internal_compliance_officer", "compliance_officer"] },
  { segment: "/organizations", label: "Проверка организаций", roles: ["internal_compliance_officer", "compliance_officer"] },
  { segment: "/forms/new", label: "Новая заявка", roles: ["user", "manager", "root"] },
  { segment: "/chats", label: "Рабочие чаты", roles: "all" },
];

/**
 * Three nested branches for manager and root.
 * Payment agents stay outside; client/provider keep a flat Documents item.
 */
export const REFERENCE_GROUPS: NavGroup[] = [
  {
    id: "organizations",
    label: "Организации",
    roles: ["manager", "root"],
    items: [
      { segment: "/agent-organization", label: "Корневая организация", roles: ["manager", "root"] },
      { segment: "/provider-organizations", label: "Организации провайдеров", roles: ["manager", "root"] },
      { segment: "/counterparties", label: "Контрагенты", roles: ["manager", "root"] },
    ],
  },
  {
    id: "reference-info",
    label: "Справочная информация",
    roles: ["manager", "root"],
    items: [
      { segment: "/codes", label: "Коды ТН ВЭД", roles: ["manager", "root"] },
      { segment: "/currencies", label: "Валюты", roles: ["manager", "root"] },
    ],
  },
  {
    id: "documents",
    label: "Документы",
    roles: ["manager", "root"],
    items: [
      { segment: "/agent-reports", label: "Отчёты", roles: ["manager", "root"] },
      { segment: "/payment-orders", label: "Платёжные поручения", roles: ["manager", "root"] },
      { segment: "/bank-certificate", label: "Справка о совершении сделки", roles: ["manager", "root"] },
    ],
  },
];

/** Flat leftover under «Справочники» (not inside the three groups). */
export const REFERENCE_FLAT: NavItem[] = [
  { segment: "/documents", label: "Документы", roles: ["user", "provider"] },
  { segment: "/counterparties", label: "Контрагенты", roles: ["user"] },
  { segment: "/providers", label: "Платёжные агенты", roles: ["manager", "root"] },
  { segment: "/compliance-tools", label: "Инструменты комплаенс", roles: ["root"] },
  { segment: "/admin", label: "Пользователи", roles: ["root"] },
  { segment: "/process-roles", label: "Роли процесса", roles: ["root"] },
  { segment: "/feature-flags", label: "Разрешения разделов", roles: ["root"] },
  { segment: "/countries", label: "Страны и риски", roles: ["root"] },
  { segment: "/testing", label: "Проверка сценариев", roles: ["root"] },
];

/** Merge leaf items by segment for feature flags / section gate (roles union). */
function mergeNavLeaves(items: NavItem[]): NavItem[] {
  const bySegment = new Map<string, NavItem>();
  for (const item of items) {
    const prev = bySegment.get(item.segment);
    if (!prev) {
      bySegment.set(item.segment, item);
      continue;
    }
    if (prev.roles === "all" || item.roles === "all") {
      bySegment.set(item.segment, { ...prev, roles: "all" });
      continue;
    }
    const roles = Array.from(new Set([...prev.roles, ...item.roles]));
    bySegment.set(item.segment, { ...prev, roles });
  }
  return Array.from(bySegment.values());
}

/** All leaf reference items (feature flags, section gate). Deduped by segment. */
export const REFERENCE_NAV: NavItem[] = mergeNavLeaves([
  ...REFERENCE_GROUPS.flatMap((group) => group.items),
  ...REFERENCE_FLAT,
]);

/** Filters nav by role/context. */
export function filterNav(items: NavItem[], role: VedRole | undefined): NavItem[] {
  return items.filter((item) => item.roles === "all" || (role && item.roles.includes(role)));
}

/** Nested reference groups visible for the role. */
export function filterNavGroups(groups: NavGroup[], role: VedRole | undefined): NavGroup[] {
  if (!role) return [];
  return groups
    .filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: filterNav(group.items, role),
    }))
    .filter((group) => group.items.length > 0);
}

/** Flat reference leaves for the role (outside nested groups). */
export function filterReferenceFlat(role: VedRole | undefined): NavItem[] {
  return filterNav(REFERENCE_FLAT, role);
}

/** Ordered leaf items for mobile strip / context menu first jump. */
export function flattenReferenceNav(role: VedRole | undefined): NavItem[] {
  const fromGroups = filterNavGroups(REFERENCE_GROUPS, role).flatMap((group) => group.items);
  return [...fromGroups, ...filterReferenceFlat(role)];
}
