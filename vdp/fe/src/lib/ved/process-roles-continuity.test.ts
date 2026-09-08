import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { nextStepHint, waitingActorLabel } from "@/lib/api/mappers";
import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { PROCESS_ROLES_QUERY_KEY } from "./use-process-roles-snapshot";

/** Snapshot shaped like alpha process-roles v3: ICO/ECO off, manager mandatory + ops. */
function processRolesV3(): ProcessRoleRow[] {
  return [
    {
      role: "user",
      enabled: true,
      priority: 10,
      influence: "actor",
      capabilities: ["form.view", "form.submit", "form.cancel_user", "form.recognize", "user.docs"],
      removable: false,
      mandatory: true,
    },
    {
      role: "sales",
      enabled: false,
      priority: 15,
      influence: "observer",
      capabilities: ["form.view", "sales.attribution"],
      removable: true,
      mandatory: false,
    },
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
      role: "compliance_officer",
      enabled: false,
      priority: 30,
      influence: "actor",
      capabilities: ["form.view", "form.compliance"],
      removable: false,
      mandatory: false,
    },
    {
      role: "manager",
      enabled: true,
      priority: 40,
      influence: "actor",
      capabilities: [
        "form.view",
        "form.recognize",
        "manager.ops",
        "manager.payment",
        "provider.payment",
      ],
      removable: false,
      mandatory: true,
    },
    {
      role: "provider",
      enabled: true,
      priority: 50,
      influence: "actor",
      capabilities: ["form.view", "provider.payment"],
      removable: false,
      mandatory: true,
    },
  ];
}

describe("process-roles continuity v3", () => {
  const v3 = processRolesV3();

  it("exposes shared query key for invalidate after admin PUT", () => {
    expect(PROCESS_ROLES_QUERY_KEY).toEqual(["process-roles"]);
  });

  it("injects ico_form_start for manager when ICO slot disabled", () => {
    const ids = actionsFor("manager", "organization_waiting_verification", v3).map((a) => a.id);
    expect(ids).toContain("ico_form_start");
  });

  it("uses continuity labels without external-compliance wording", () => {
    const labels = actionsFor("manager", "organization_verification", v3).map((a) => a.label);
    expect(labels.some((l) => /Одобрить организацию и продолжить/.test(l))).toBe(true);
    expect(labels.join(" ")).not.toMatch(/внешн/i);
  });

  it("hides ICO CTA when ICO disabled in snapshot", () => {
    expect(actionsFor("internal_compliance_officer", "organization_waiting_verification", v3)).toEqual([]);
  });

  it("next-step for manager is take-in-work, not waiting on compliance", () => {
    const hint = nextStepHint("organization_waiting_verification", "manager", v3);
    expect(hint).toContain("Взять организацию в проверку");
    expect(hint).not.toMatch(/Сейчас действует/);
  });

  it("waiting actor names manager when continuity owns org-waiting", () => {
    const label = waitingActorLabel("organization_waiting_verification", v3);
    expect(label).toBeTruthy();
    expect(label!.toLowerCase()).toMatch(/менеджер/);
    expect(label!.toLowerCase()).not.toMatch(/комплаенс/);
  });

  it("injects eco_form_start for manager when ECO slot disabled", () => {
    const ids = actionsFor("manager", "form_waiting_verification", v3).map((a) => a.id);
    expect(ids).toContain("eco_form_start");
  });

  it("injects accept and reject for manager on form_verification", () => {
    const ids = actionsFor("manager", "form_verification", v3).map((a) => a.id);
    expect(ids).toContain("eco_form_accept");
    expect(ids).toContain("eco_form_reject");
  });
});
