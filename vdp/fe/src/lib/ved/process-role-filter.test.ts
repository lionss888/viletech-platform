import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { treasurerOpsRecipient } from "./process-role-filter";
import {
  getImportAdvanceCoverageCopy,
  isTreasurerSkipDisposition,
  showAwaitsTreasurerBanner,
} from "./status-copy";

describe("actionsFor with process roles", () => {
  it("hides CTA when role disabled in process config", () => {
    const rows: ProcessRoleRow[] = [
      {
        role: "compliance_officer",
        enabled: false,
        priority: 30,
        influence: "actor",
        capabilities: ["form.view", "form.compliance"],
        removable: false,
        mandatory: true,
      },
    ];
    expect(actionsFor("compliance_officer", "form_waiting_verification", rows)).toEqual([]);
  });

  it("keeps CTA when config absent (demo parity)", () => {
    const ids = actionsFor("compliance_officer", "form_waiting_verification").map((a) => a.id);
    expect(ids).toContain("eco_form_start");
  });

  it("filters by missing capability", () => {
    const rows: ProcessRoleRow[] = [
      {
        role: "manager",
        enabled: true,
        priority: 40,
        influence: "actor",
        capabilities: ["form.view"],
        removable: false,
        mandatory: true,
      },
    ];
    const ids = actionsFor("manager", "form_accepted", rows).map((a) => a.id);
    expect(ids).not.toContain("mgr_assign_agent");
  });

  it("does not require org.compliance on manager for continuity inject", () => {
    const rows: ProcessRoleRow[] = [
      {
        role: "internal_compliance_officer",
        enabled: false,
        priority: 20,
        influence: "actor",
        capabilities: ["form.view", "org.compliance"],
        removable: false,
        mandatory: false,
      },
      {
        role: "manager",
        enabled: true,
        priority: 40,
        influence: "actor",
        capabilities: ["form.view", "manager.ops"],
        removable: false,
        mandatory: true,
      },
    ];
    const ids = actionsFor("manager", "organization_waiting_verification", rows).map((a) => a.id);
    expect(ids).toContain("ico_form_start");
  });

  it("injects treas CTA for manager on treasurer skip disposition", () => {
    const rows: ProcessRoleRow[] = [
      {
        role: "treasurer",
        enabled: false,
        priority: 45,
        influence: "none",
        capabilities: ["form.view", "treasurer.ops"],
        removable: true,
        mandatory: false,
        disable_mode: "skip",
        handoff_role: "manager",
      },
      {
        role: "manager",
        enabled: true,
        priority: 40,
        influence: "actor",
        capabilities: ["form.view", "manager.ops"],
        removable: false,
        mandatory: true,
      },
    ];
    const mgrIds = actionsFor("manager", "payment_received", rows).map((a) => a.id);
    expect(mgrIds).toContain("treas_confirm_payment");
    const confirm = actionsFor("manager", "payment_received", rows).find(
      (a) => a.id === "treas_confirm_payment",
    );
    expect(confirm?.label).toBe("Подтвердить поступление");
    expect(confirm?.label).not.toMatch(/без казначея/i);
    const treasIds = actionsFor("treasurer", "payment_received", rows).map((a) => a.id);
    expect(treasIds).not.toContain("treas_confirm_payment");
  });

  it("does not inject treas CTA when treasurer disabled without disposition", () => {
    const rows: ProcessRoleRow[] = [
      {
        role: "treasurer",
        enabled: false,
        priority: 45,
        influence: "none",
        capabilities: ["form.view", "treasurer.ops"],
        removable: true,
        mandatory: false,
      },
      {
        role: "manager",
        enabled: true,
        priority: 40,
        influence: "actor",
        capabilities: ["form.view", "manager.ops"],
        removable: false,
        mandatory: true,
      },
    ];
    const mgrIds = actionsFor("manager", "payment_received", rows).map((a) => a.id);
    expect(mgrIds).not.toContain("treas_confirm_payment");
  });
});

describe("getImportAdvanceCoverageCopy with treasurer skip", () => {
  const skipRows: ProcessRoleRow[] = [
    {
      role: "treasurer",
      enabled: false,
      priority: 45,
      influence: "none",
      capabilities: ["form.view", "treasurer.ops"],
      removable: true,
      mandatory: false,
      disable_mode: "skip",
      handoff_role: "manager",
    },
  ];

  it("returns manager-focused copy when treasurer is skipped", () => {
    expect(getImportAdvanceCoverageCopy({ role: "manager", processRoles: skipRows })).toBe(
      "Подтвердите поступление средств",
    );
  });

  it("does not mention treasurer for user when treasurer is skipped", () => {
    const copy = getImportAdvanceCoverageCopy({ role: "user", processRoles: skipRows });
    expect(copy).not.toMatch(/казначе/i);
    expect(copy).toBe("Ожидается подтверждение поступления средств");
  });

  it("returns treasurer mention when treasurer is enabled", () => {
    const enabledRows: ProcessRoleRow[] = [
      {
        role: "treasurer",
        enabled: true,
        priority: 45,
        influence: "actor",
        capabilities: ["form.view", "treasurer.ops"],
        removable: true,
        mandatory: false,
      },
    ];
    expect(getImportAdvanceCoverageCopy({ role: "user", processRoles: enabledRows })).toMatch(
      /казначе/i,
    );
  });

  it("hides awaits-treasurer banner for manager when treasurer is skipped", () => {
    expect(
      showAwaitsTreasurerBanner({
        status: "payment_received",
        role: "manager",
        condition: "advance",
        direction: "import",
        processRoles: skipRows,
      }),
    ).toBe(false);
    expect(
      showAwaitsTreasurerBanner({
        status: "payment_received",
        role: "manager",
        condition: "advance",
        direction: "import",
      }),
    ).toBe(true);
  });

  it("exposes treasurerOpsRecipient as manager on skip", () => {
    expect(treasurerOpsRecipient(skipRows)).toBe("manager");
    expect(isTreasurerSkipDisposition(skipRows)).toBe(true);
  });
});
