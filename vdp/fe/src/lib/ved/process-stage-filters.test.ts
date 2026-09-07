import { describe, expect, it } from "vitest";

import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { isComplianceProcessActive, verificationQueueLabel } from "./process-stage-filters";

function row(partial: Partial<ProcessRoleRow> & Pick<ProcessRoleRow, "role">): ProcessRoleRow {
  return {
    enabled: true,
    priority: 1,
    influence: "actor",
    capabilities: [],
    removable: true,
    mandatory: false,
    ...partial,
  };
}

describe("process-stage-filters", () => {
  it("treats missing config as compliance-active (safe default)", () => {
    expect(isComplianceProcessActive(undefined)).toBe(true);
    expect(verificationQueueLabel(undefined)).toBe("На комплаенсе");
  });

  it("detects ICO/ECO disabled pilot spine", () => {
    const roles = [
      row({ role: "manager", enabled: true }),
      row({ role: "internal_compliance_officer", enabled: false }),
      row({ role: "compliance_officer", enabled: false }),
    ];
    expect(isComplianceProcessActive(roles)).toBe(false);
    expect(verificationQueueLabel(roles)).toBe("На проверке");
  });

  it("stays active when ICO is an enabled actor", () => {
    const roles = [row({ role: "internal_compliance_officer", enabled: true, influence: "actor" })];
    expect(isComplianceProcessActive(roles)).toBe(true);
  });
});
