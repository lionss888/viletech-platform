import { describe, expect, it } from "vitest";

import type { ProcessRoleRow } from "@/lib/api/process-roles";
import {
  displayStageId,
  isComplianceProcessActive,
  stagesForProcess,
  statusFiltersForProcess,
  statusMetaForProcess,
  verificationQueueLabel,
} from "./process-stage-filters";

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

function continuityRoles(): ProcessRoleRow[] {
  return [
    row({ role: "manager", enabled: true }),
    row({ role: "internal_compliance_officer", enabled: false }),
    row({ role: "compliance_officer", enabled: false }),
  ];
}

describe("process-stage-filters", () => {
  it("treats missing config as compliance-active (safe default)", () => {
    expect(isComplianceProcessActive(undefined)).toBe(true);
    expect(verificationQueueLabel(undefined)).toBe("На комплаенсе");
  });

  it("detects ICO/ECO disabled pilot spine", () => {
    const roles = continuityRoles();
    expect(isComplianceProcessActive(roles)).toBe(false);
    expect(verificationQueueLabel(roles)).toBe("На проверке");
  });

  it("stays active when ICO is an enabled actor", () => {
    const roles = [row({ role: "internal_compliance_officer", enabled: true, influence: "actor" })];
    expect(isComplianceProcessActive(roles)).toBe(true);
  });

  it("remaps form_verification badge copy without compliance wording", () => {
    const meta = statusMetaForProcess("form_verification", continuityRoles());
    expect(meta.label).toBe("Менеджер проверяет заявку");
    expect(meta.short).toBe("Проверка");
    expect(meta.label.toLowerCase()).not.toMatch(/комплаенс/);
  });

  it("remaps waiting badge short away from Ожидание КО", () => {
    const meta = statusMetaForProcess("form_waiting_verification", continuityRoles());
    expect(meta.short).toBe("У менеджера");
    expect(meta.short).not.toMatch(/КО/);
    expect(meta.label.toLowerCase()).not.toMatch(/комплаенс/);
  });

  it("renames lifecycle stage and hides organization when ICO/ECO off", () => {
    const stages = stagesForProcess(continuityRoles());
    expect(stages.some((s) => s.id === "organization_verification")).toBe(false);
    const review = stages.find((s) => s.id === "form_verification");
    expect(review?.label).toBe("Проверка");
    expect(review?.label).not.toMatch(/Комплаенс/);
    expect(displayStageId("form_verification", continuityRoles())).toBe("form_verification");
    expect(displayStageId("organization_waiting_verification", continuityRoles())).toBe(
      "form_verification",
    );
  });

  it("renames status filter На комплаенсе when continuity", () => {
    const filters = statusFiltersForProcess(continuityRoles());
    const compliance = filters.find((f) => f.value === "compliance");
    expect(compliance?.label).toBe("На проверке");
  });

  it("keeps compliance labels when ECO is an actor", () => {
    const roles = [
      row({ role: "compliance_officer", enabled: true, influence: "actor" }),
      row({ role: "internal_compliance_officer", enabled: false }),
    ];
    expect(statusMetaForProcess("form_verification", roles).label).toMatch(/Комплаенс/);
  });
});
