import { describe, expect, it } from "vitest";

import {
  currentSubjectVerdictReason,
  orgBlocksApproval,
  orgPendingIco,
  shouldSetCounterpartyApproval,
  subjectsCleared,
  subjectsPendingReview,
  subjectState,
  type ReviewSubject,
} from "./compliance";

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

  it("subjectsPendingReview does not lock on empty or cleared subjects", () => {
    expect(subjectsPendingReview([])).toBe(false);
    expect(subjectsPendingReview([org("approved"), cp("approved")])).toBe(false);
    expect(subjectsPendingReview([org("waiting_verification")])).toBe(true);
    expect(subjectsPendingReview([org("blocked")])).toBe(false);
  });

  it("does not reopen the current verdict", () => {
    expect(currentSubjectVerdictReason("approved", "approved")).toBe("Уже проверен");
    expect(currentSubjectVerdictReason("waiting_verification", "waiting_verification")).toBe(
      "Сведения уже запрошены",
    );
    expect(currentSubjectVerdictReason("blocked", "blocked")).toBe("Уже заблокирован");
    expect(currentSubjectVerdictReason("not_approved", "approved")).toBeUndefined();
    expect(currentSubjectVerdictReason("approved", "blocked")).toBeUndefined();
  });

  it("sends manager approval through the approval API, not a catalog patch", () => {
    expect(shouldSetCounterpartyApproval("manager", "approved", true)).toBe(true);
    expect(shouldSetCounterpartyApproval("root", "approved", true)).toBe(true);
    expect(shouldSetCounterpartyApproval("user", "approved", true)).toBe(false);
    expect(shouldSetCounterpartyApproval("provider", "approved", true)).toBe(false);
    expect(shouldSetCounterpartyApproval("manager", "approved", false)).toBe(false);
  });
});
