import type { VedRole } from "./types";

export type RoleMeta = {
  id: VedRole;
  group: string;
  title: string;
  seedEmail: string;
  seedPassword: string;
  personName: string;
};

/** Роли BDUI-контракта + seed-аккаунты vdp core (docs/development/getting-started.md). */
export const ROLES: RoleMeta[] = [
  {
    id: "user",
    group: "Личный кабинет",
    title: "Клиент",
    seedEmail: "user@vdp.local",
    seedPassword: "user",
    personName: "Ivan Petrov",
  },
  {
    id: "internal_compliance_officer",
    group: "Контроль",
    title: "Внутренний комплаенс",
    seedEmail: "ico@vdp.local",
    seedPassword: "ico",
    personName: "Е. Соколова",
  },
  {
    id: "compliance_officer",
    group: "Проверка",
    title: "Внешний комплаенс",
    seedEmail: "eco@vdp.local",
    seedPassword: "eco",
    personName: "М. Гаврилов",
  },
  {
    id: "manager",
    group: "Операции",
    title: "Менеджер",
    seedEmail: "manager@vdp.local",
    seedPassword: "manager",
    personName: "П. Иванов",
  },
  {
    id: "provider",
    group: "Сервис",
    title: "Провайдер",
    seedEmail: "provider@vdp.local",
    seedPassword: "provider",
    personName: "S. Chen",
  },
  {
    id: "root",
    group: "Система",
    title: "Суперадмин",
    seedEmail: "root@vdp.local",
    seedPassword: "root",
    personName: "А. Константинов",
  },
];

export const ROLE_MAP: Record<VedRole, RoleMeta> = ROLES.reduce(
  (acc, role) => ({ ...acc, [role.id]: role }),
  {} as Record<VedRole, RoleMeta>,
);

export function roleTitle(role: VedRole): string {
  return ROLE_MAP[role]?.title ?? role;
}
