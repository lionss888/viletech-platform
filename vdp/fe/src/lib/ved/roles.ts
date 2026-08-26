import type { VedRole } from "./types";

export type RoleMeta = {
  id: VedRole;
  group: string;
  title: string;
  seedEmail: string;
  seedPassword: string;
  personName: string;
};

/** Роли BDUI-контракта + seed-аккаунты из fe-experiment/README.md. */
export const ROLES: RoleMeta[] = [
  {
    id: "user",
    group: "Личный кабинет",
    title: "Клиент",
    seedEmail: "user@bdui.local",
    seedPassword: "BduiUser2024!",
    personName: "Д. Морозов",
  },
  {
    id: "internal_compliance_officer",
    group: "Контроль",
    title: "Внутренний комплаенс",
    seedEmail: "ico@bdui.local",
    seedPassword: "BduiLifecycle2024!",
    personName: "Е. Соколова",
  },
  {
    id: "compliance_officer",
    group: "Проверка",
    title: "Внешний комплаенс",
    seedEmail: "eco@bdui.local",
    seedPassword: "BduiLifecycle2024!",
    personName: "М. Гаврилов",
  },
  {
    id: "manager",
    group: "Операции",
    title: "Менеджер",
    seedEmail: "manager@bdui.local",
    seedPassword: "BduiLifecycle2024!",
    personName: "П. Иванов",
  },
  {
    id: "provider",
    group: "Сервис",
    title: "Провайдер",
    seedEmail: "provider@bdui.local",
    seedPassword: "BduiLifecycle2024!",
    personName: "S. Chen",
  },
  {
    id: "root",
    group: "Система",
    title: "Суперадмин",
    seedEmail: "root@bdui.local",
    seedPassword: "BduiLifecycle2024!",
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
