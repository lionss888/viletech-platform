import type {
  CoreAdminAccount,
  CoreAgent,
  CoreCounterparty,
  CoreCurrency,
  CoreHsCode,
  CoreOrganization,
} from "./catalog";
import type { Counterparty, Organization, PlatformUser, VedRole } from "@/lib/ved/types";
import type { ComplianceToolRecord, CountryRecord, CurrencyRecord, HsCodeRecord, ProviderRecord } from "@/lib/ved/reference";
import { staticCatalogSeed } from "@/lib/ved/catalog-source";

/** Maps core org status (+ blocked flag) to UI Organization.status. */
export function mapOrgStatus(raw: string | undefined, blocked?: boolean): Organization["status"] {
  if (blocked || raw === "blocked") return "blocked";
  if (raw === "approved" || raw === "waiting_verification" || raw === "not_approved") {
    return raw;
  }
  if (raw === "active") return "approved";
  if (raw === "awaiting_processing") return "waiting_verification";
  return "waiting_verification";
}

export function mapCoreOrganization(org: CoreOrganization): Organization {
  return {
    id: org.id,
    name: org.name,
    inn: org.inn ?? "—",
    legalAddress: org.legal_address ?? "—",
    status: mapOrgStatus(org.status, org.blocked),
    clientType: org.client_type,
    bankFixedCommissionPercent: org.bank_fixed_commission_percent,
    applyPlatformMarkup: org.apply_platform_markup,
    defaultAgentId: org.default_agent_id,
    bankWebhookUrl: org.bank_webhook_url,
    createdAt: org.created_at ?? new Date().toISOString(),
  };
}

export function mapCoreCounterparty(cp: CoreCounterparty): Counterparty {
  return {
    id: cp.id,
    name: cp.name,
    country: cp.country_code ?? "—",
    countryCode: cp.country_code ?? "—",
    bank: "—",
    swift: "—",
    scope: "foreign",
    status: cp.status === "approved" ? "approved" : "not_approved",
  };
}

export function mapCoreAgent(agent: CoreAgent): ProviderRecord {
  return {
    id: agent.id,
    name: agent.name,
    country: "—",
    corridors: "—",
    contact: "—",
    slaHours: 24,
    status: agent.status === "paused" ? "paused" : "active",
  };
}

export function mapCoreCurrency(c: CoreCurrency): CurrencyRecord {
  return {
    code: c.code,
    title: c.name ?? c.code,
    rate: "—",
    status: "active",
  };
}

export function mapCoreHs(h: CoreHsCode): HsCodeRecord {
  return {
    code: h.code,
    title: h.title ?? h.code,
    duty: "—",
    license: false,
  };
}

export function mapCoreAdminAccount(a: CoreAdminAccount): PlatformUser {
  const role = (a.role ?? "user") as VedRole;
  return {
    id: a.id,
    name: a.full_name ?? a.email,
    email: a.email,
    role,
    blocked: Boolean(a.blocked),
    createdAt: a.created_at ?? new Date().toISOString(),
  };
}

/** Static reference data where core has no dedicated UI catalog yet. */
export function staticReferenceData(): {
  countries: CountryRecord[];
  complianceTools: ComplianceToolRecord[];
  fallbackProviders: ProviderRecord[];
  fallbackCurrencies: CurrencyRecord[];
  fallbackHsCodes: HsCodeRecord[];
} {
  const seed = staticCatalogSeed();
  return {
    countries: seed.countries,
    complianceTools: seed.complianceTools,
    fallbackProviders: seed.providers,
    fallbackCurrencies: seed.currencies,
    fallbackHsCodes: seed.hsCodes,
  };
}
