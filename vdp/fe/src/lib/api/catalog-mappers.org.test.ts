import { describe, expect, it } from "vitest";

import { mapCoreOrganization, mapOrgStatus } from "./catalog-mappers";
import type { CoreOrganization } from "./catalog";

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
