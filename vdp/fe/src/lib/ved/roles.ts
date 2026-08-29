import type { VedRole } from "./types";

export type RoleMeta = {
  id: VedRole;
  group: string;
  title: string;
  seedEmail: string;
  seedPassword: string;
  personName: string;
};

/** Seed-аккаунты для demo-контура (`/demo/login`), не связаны с app JWT. */
export const ROLES: RoleMeta[] = [
  {
    id: "user",
    group: "Личный кабинет",
    title: "Клиент",
    seedEmail: "user@demo.vdp.local",
    seedPassword: "DemoUser2024!",
    personName: "Д. Морозов",
  },
  {
    id: "internal_compliance_officer",
    group: "Контроль",
    title: "Внутренний комплаенс",
    seedEmail: "ico@demo.vdp.local",
    seedPassword: "DemoLifecycle2024!",
    personName: "Е. Соколова",
  },
  {
    id: "compliance_officer",
    group: "Проверка",
    title: "Внешний комплаенс",
    seedEmail: "eco@demo.vdp.local",
    seedPassword: "DemoLifecycle2024!",
    personName: "М. Гаврилов",
  },
  {
    id: "manager",
    group: "Операции",
    title: "Менеджер",
    seedEmail: "manager@demo.vdp.local",
    seedPassword: "DemoLifecycle2024!",
    personName: "П. Иванов",
  },
  {
    id: "provider",
    group: "Сервис",
    title: "Провайдер",
    seedEmail: "provider@demo.vdp.local",
    seedPassword: "DemoLifecycle2024!",
    personName: "S. Chen",
  },
  {
    id: "root",
    group: "Система",
    title: "Суперадмин",
    seedEmail: "root@demo.vdp.local",
    seedPassword: "DemoLifecycle2024!",
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
