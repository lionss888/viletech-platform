import { describe, expect, it } from "vitest";

import {
  mapCoreAdminAccount,
  mapCoreAgent,
  mapCoreCounterparty,
  mapCoreOrganization,
  mapOrgStatus,
} from "./catalog-mappers";
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

describe("mapCoreCounterparty", () => {
  it("maps core country field used by /api/v1/counterparties", () => {
    const actual = mapCoreCounterparty({
      id: "cp-1",
      name: "Shenzhen Kaiyuan Electronics Co., Ltd",
      country: "CN",
      last_approval_status: "approved",
    });
    expect(actual.name).toContain("Shenzhen");
    expect(actual.country).toBe("CN");
    expect(actual.status).toBe("approved");
  });

  it("parses multi-bank JSON into list and primary bank/swift", () => {
    const actual = mapCoreCounterparty({
      id: "cp-2",
      name: "Multi Bank Co",
      country: "DE",
      banks: JSON.stringify([
        { uuid: "b1", name: "Deutsche Bank", swift: "DEUTDEFF", accounts: [{ uuid: "a1", number: "DE00" }] },
        { uuid: "b2", name: "Commerzbank", swift: "COBADEFF", accounts: [] },
      ]),
    });
    expect(actual.banks).toHaveLength(2);
    expect(actual.banks[0]?.name).toBe("Deutsche Bank");
    expect(actual.banks[0]?.swift).toBe("DEUTDEFF");
    expect(actual.banks[0]?.account).toBe("DE00");
    expect(actual.banks[1]?.name).toBe("Commerzbank");
    expect(actual.bank).toBe("Deutsche Bank");
    expect(actual.swift).toBe("DEUTDEFF");
  });

  it("keeps empty banks as dash primary fields", () => {
    const actual = mapCoreCounterparty({
      id: "cp-3",
      name: "No Bank Co",
      banks: "[]",
    });
    expect(actual.banks).toEqual([]);
    expect(actual.bank).toBe("—");
    expect(actual.swift).toBe("—");
  });
});

describe("mapCoreAgent", () => {
  it("maps catalog fields instead of hardcoding dashes", () => {
    const got = mapCoreAgent({
      id: "ag1",
      name: "For test",
      country: "HK",
      corridors: "CNY, USD",
      contact: "ops@provider.com",
      sla_hours: 12,
      active: true,
    });
    expect(got.country).toBe("HK");
    expect(got.corridors).toBe("CNY, USD");
    expect(got.contact).toBe("ops@provider.com");
    expect(got.slaHours).toBe(12);
    expect(got.status).toBe("active");
  });

  it("marks paused when active is false", () => {
    expect(mapCoreAgent({ id: "ag2", name: "X", active: false }).status).toBe("paused");
  });
});
