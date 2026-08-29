import type { VedRole } from "./types";

/** Compose / core seed logins for app mode (`/login`), not demo quick-switch. */
export type AppSeedAccount = {
  role: VedRole;
  title: string;
  email: string;
  password: string;
  personName: string;
};

export const APP_SEED_ACCOUNTS: AppSeedAccount[] = [
  { role: "user", title: "Клиент", email: "user@vdp.local", password: "user", personName: "User seed" },
  { role: "manager", title: "Менеджер", email: "manager@vdp.local", password: "manager", personName: "Manager seed" },
  {
    role: "internal_compliance_officer",
    title: "Внутренний комплаенс",
    email: "ico@vdp.local",
    password: "ico",
    personName: "ICO seed",
  },
  {
    role: "compliance_officer",
    title: "Внешний комплаенс",
    email: "eco@vdp.local",
    password: "eco",
    personName: "ECO seed",
  },
  { role: "provider", title: "Провайдер", email: "provider@vdp.local", password: "provider", personName: "Provider seed" },
  { role: "root", title: "Суперадмин", email: "root@vdp.local", password: "root", personName: "Root seed" },
];

export function appSeedByRole(role: VedRole): AppSeedAccount | undefined {
  return APP_SEED_ACCOUNTS.find((a) => a.role === role);
}
