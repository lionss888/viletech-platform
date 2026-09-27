import { describe, expect, it } from "vitest";

import {
  defaultWizardOrganizationId,
  isProbeOrganizationName,
  sortOrganizationsForWizard,
} from "./org-wizard-order";

describe("org-wizard-order", () => {
  const orgs = [
    { id: "inline-1", name: "Inline Org 1790" },
    { id: "seed", name: "ООО Пример" },
    { id: "real", name: "АО Клиент" },
    { id: "inline-2", name: "Inline Org 1791" },
  ];

  it("sorts seed and preferred before probe Inline Org", () => {
    const sorted = sortOrganizationsForWizard(orgs);
    expect(sorted.map((o) => o.id)).toEqual(["seed", "real", "inline-1", "inline-2"]);
  });

  it("puts account preferred org first", () => {
    const sorted = sortOrganizationsForWizard(orgs, "real");
    expect(sorted[0]?.id).toBe("real");
    expect(sorted[1]?.id).toBe("seed");
  });

  it("defaultWizardOrganizationId picks seed when present", () => {
    expect(defaultWizardOrganizationId(orgs)).toBe("seed");
    expect(defaultWizardOrganizationId(orgs, "inline-1")).toBe("inline-1");
  });

  it("F3 regression: selecting another counterparty must not clear org id", () => {
    const orgId = "66666666-6666-6666-6666-666666666666";
    const draft = { organizationId: orgId, counterpartyId: "cp-a" };
    const afterCpChange = { ...draft, counterpartyId: "cp-b" };
    expect(afterCpChange.organizationId).toBe(orgId);
    expect(defaultWizardOrganizationId([{ id: orgId, name: "ООО Пример" }], orgId)).toBe(orgId);
  });
});
