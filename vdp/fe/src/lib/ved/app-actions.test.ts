import { describe, expect, it } from "vitest";

import { appActionsFor, coreActionById, coveredStatusCount } from "./app-actions";

describe("appActionsFor", () => {
  it("maps user draft submit to domain submit", () => {
    const actions = appActionsFor("user", "draft");
    expect(actions.some((a) => a.coreAction === "submit")).toBe(true);
  });

  it("maps ico start on organization_waiting_verification", () => {
    const actions = appActionsFor("internal_compliance_officer", "organization_waiting_verification");
    expect(actions[0]?.coreAction).toBe("ico_start");
  });

  it("returns empty for unknown status", () => {
    expect(appActionsFor("manager", "completed")).toEqual([]);
  });
});

describe("coreActionById", () => {
  it("resolves submit id", () => {
    expect(coreActionById("submit")).toBe("submit");
  });
});

describe("coveredStatusCount", () => {
  it("reports partial coverage against known baseline", () => {
    const { covered, totalKnown } = coveredStatusCount();
    expect(covered).toBeGreaterThan(5);
    expect(totalKnown).toBe(40);
    expect(covered).toBeLessThan(totalKnown);
  });
});
