import { describe, expect, it } from "vitest";

import {
  filterProviderOrganizations,
  resolveAgentOrganizationCard,
  ROOT_ORG_PLACE_LINE,
} from "./agent-organization";
import type { Organization } from "./types";

const orgs: Organization[] = [
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: "ООО Агент ВЭД",
    inn: "7700000002",
    legalAddress: "—",
    status: "approved",
    type: "client",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "prov-1",
    name: "Provider Org",
    inn: "7700000099",
    legalAddress: "—",
    status: "approved",
    type: "provider",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

describe("resolveAgentOrganizationCard", () => {
  it("shows outside-accounts line for root", () => {
    expect(
      resolveAgentOrganizationCard({
        role: "root",
        organizationId: orgs[0]?.id,
        organizations: orgs,
      }),
    ).toEqual({ kind: "root_outside" });
    expect(ROOT_ORG_PLACE_LINE).toBe("Вне учётных записей");
  });

  it("returns manager card for seeded organization", () => {
    const card = resolveAgentOrganizationCard({
      role: "manager",
      organizationId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      organizations: orgs,
    });
    expect(card.kind).toBe("card");
    if (card.kind === "card") {
      expect(card.organization.name).toBe("ООО Агент ВЭД");
      expect(card.organization.inn).toBe("7700000002");
    }
  });

  it("returns missing when manager has no org", () => {
    expect(
      resolveAgentOrganizationCard({ role: "manager", organizationId: undefined, organizations: orgs }),
    ).toEqual({ kind: "missing" });
  });
});

describe("filterProviderOrganizations", () => {
  it("keeps only type=provider", () => {
    expect(filterProviderOrganizations(orgs).map((o) => o.id)).toEqual(["prov-1"]);
  });
});
