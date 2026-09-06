import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import type { ProcessRoleRow } from "@/lib/api/process-roles";

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
});
