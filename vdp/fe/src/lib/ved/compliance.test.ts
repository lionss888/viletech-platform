import { describe, expect, it } from "vitest";

import { orgBlocksApproval, orgPendingIco, subjectsCleared, subjectState, type ReviewSubject } from "./compliance";

const org = (status: string): ReviewSubject => ({
  key: "organizations",
  id: "org-1",
  kind: "Организация клиента",
  name: "Test Org",
  detail: "ИНН 123",
  status,
});

const cp = (status: string): ReviewSubject => ({
  key: "counterparties",
  id: "cp-1",
  kind: "Контрагент",
  name: "CP",
  detail: "US",
  status,
});

describe("compliance gating", () => {
  it("subjectsCleared requires all ok", () => {
    expect(subjectsCleared([org("approved"), cp("approved")])).toBe(true);
    expect(subjectsCleared([org("waiting_verification"), cp("approved")])).toBe(false);
  });

  it("orgBlocksApproval on blocked org", () => {
    expect(orgBlocksApproval([org("blocked"), cp("approved")])).toBe(true);
    expect(orgBlocksApproval([org("approved")])).toBe(false);
  });

  it("orgPendingIco when org not approved and not blocked", () => {
    expect(orgPendingIco([org("waiting_verification")])).toBe(true);
    expect(orgPendingIco([org("blocked")])).toBe(false);
    expect(orgPendingIco([org("approved")])).toBe(false);
  });

  it("subjectState maps blocked", () => {
    expect(subjectState("blocked").ok).toBe(false);
    expect(subjectState("approved").ok).toBe(true);
  });
});
