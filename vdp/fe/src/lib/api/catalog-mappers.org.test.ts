import { describe, expect, it } from "vitest";

import { mapCoreAdminAccount, mapCoreOrganization, mapOrgStatus } from "./catalog-mappers";
import type { CoreAdminAccount, CoreOrganization } from "./catalog";

describe("mapOrgStatus", () => {
  it("keeps blocked status for orgBlocksApproval", () => {
    expect(mapOrgStatus("blocked")).toBe("blocked");
    expect(mapOrgStatus("approved", true)).toBe("blocked");
  });

  it("maps approved and awaiting", () => {
    expect(mapOrgStatus("approved")).toBe("approved");
    expect(mapOrgStatus("awaiting_processing")).toBe("waiting_verification");
    expect(mapOrgStatus("not_approved")).toBe("not_approved");
  });
});

describe("mapCoreOrganization", () => {
  it("does not collapse blocked into not_approved", () => {
    const org = {
      id: "o1",
      name: "Blocked Co",
      status: "blocked",
      blocked: true,
      inn: "1",
    } as CoreOrganization;
    expect(mapCoreOrganization(org).status).toBe("blocked");
  });
});

describe("mapCoreAdminAccount", () => {
  it("falls back to email when full_name is empty (root admin list)", () => {
    const input: CoreAdminAccount = {
      id: "a1",
      email: "manager@vdp.local",
      role: "manager",
      full_name: "",
      blocked: false,
    };
    const actual = mapCoreAdminAccount(input);
    expect(actual.name).toBe("manager@vdp.local");
  });

  it("uses trimmed full_name when present", () => {
    const input: CoreAdminAccount = {
      id: "a2",
      email: "root@vdp.local",
      role: "root",
      full_name: "  Root Admin  ",
      blocked: false,
    };
    expect(mapCoreAdminAccount(input).name).toBe("Root Admin");
  });
});
