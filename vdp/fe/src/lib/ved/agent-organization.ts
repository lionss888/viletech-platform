import { ROOT_PROFILE_PLACE_LINE } from "./root-profile-card";
import type { Organization } from "./types";

export const ROOT_ORG_PLACE_LINE = ROOT_PROFILE_PLACE_LINE;

export type AgentOrganizationCard =
  | { kind: "root_outside" }
  | { kind: "missing" }
  | { kind: "card"; organization: Pick<Organization, "id" | "name" | "inn" | "status"> };

/**
 * Resolves the manager root-org card, or the root «outside accounts» place line.
 */
export function resolveAgentOrganizationCard(input: {
  role: string | undefined;
  organizationId: string | undefined;
  organizations: Organization[];
}): AgentOrganizationCard {
  if (input.role === "root") {
    return { kind: "root_outside" };
  }
  const orgId = input.organizationId?.trim();
  if (!orgId) {
    return { kind: "missing" };
  }
  const organization = input.organizations.find((org) => org.id === orgId);
  if (!organization) {
    return { kind: "missing" };
  }
  return {
    kind: "card",
    organization: {
      id: organization.id,
      name: organization.name,
      inn: organization.inn,
      status: organization.status,
    },
  };
}

const STATUS_LABEL: Record<Organization["status"], string> = {
  approved: "Одобрена",
  waiting_verification: "Ожидает проверки",
  not_approved: "Не одобрена",
  blocked: "Заблокирована",
};

/** Human-readable organization status for the agent card. */
export function organizationStatusLabel(status: Organization["status"]): string {
  return STATUS_LABEL[status] ?? status;
}

/** Organizations with type provider (not payment-agent catalog). */
export function filterProviderOrganizations(organizations: Organization[]): Organization[] {
  return organizations.filter((org) => org.type === "provider");
}
