import type { VedRole } from "./types";

/** Compose / core seed logins for app mode (`/login`), not demo quick-switch. */
export type AppSeedRole = VedRole | "bank";

export type AppSeedAccount = {
  role: AppSeedRole;
  title: string;
  email: string;
  password: string;
  personName: string;
  accountId: string;
  organizationId?: string;
};

/**
 * Mirrors `vdp/core/internal/repository/seed/seed.go`.
 * Password equals the email local-part.
 */
export const APP_SEED_ACCOUNTS: AppSeedAccount[] = [
  {
    role: "user",
    title: "Клиент",
    email: "user@vdp.local",
    password: "user",
    personName: "Ivan Petrov",
    accountId: "11111111-1111-1111-1111-111111111111",
    organizationId: "66666666-6666-6666-6666-666666666666",
  },
  {
    role: "manager",
    title: "Менеджер",
    email: "manager@vdp.local",
    password: "manager",
    personName: "Manager Seed",
    accountId: "22222222-2222-2222-2222-222222222222",
  },
  {
    role: "internal_compliance_officer",
    title: "Внутренний комплаенс",
    email: "ico@vdp.local",
    password: "ico",
    personName: "ICO Seed",
    accountId: "33333333-3333-3333-3333-333333333333",
  },
  {
    role: "compliance_officer",
    title: "Внешний комплаенс",
    email: "eco@vdp.local",
    password: "eco",
    personName: "ECO Seed",
    accountId: "44444444-4444-4444-4444-444444444444",
  },
  {
    role: "provider",
    title: "Провайдер",
    email: "provider@vdp.local",
    password: "provider",
    personName: "Provider Seed",
    accountId: "55555555-5555-5555-5555-555555555555",
  },
  {
    role: "root",
    title: "Суперадмин",
    email: "root@vdp.local",
    password: "root",
    personName: "Root Admin",
    accountId: "99999999-9999-9999-9999-999999999999",
  },
  {
    role: "bank",
    title: "Банк",
    email: "bank@vdp.local",
    password: "bank",
    personName: "Bank Seed",
    accountId: "77777777-7777-7777-7777-777777777777",
    organizationId: "88888888-8888-8888-8888-888888888888",
  },
];

/** VED helper: appSeedByRole. */
export function appSeedByRole(role: AppSeedRole): AppSeedAccount | undefined {
  return APP_SEED_ACCOUNTS.find((a) => a.role === role);
}
