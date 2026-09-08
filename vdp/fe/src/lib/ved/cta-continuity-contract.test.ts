import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import type { ProcessRoleRow } from "@/lib/api/process-roles";
import { coreActionById } from "./app-actions";
import { demoActionToCore } from "./action-bridge";

/** Continuity spine: ICO/ECO off, manager.ops on. */
function continuityRoles(): ProcessRoleRow[] {
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
      capabilities: ["form.view", "form.recognize", "manager.ops", "manager.payment", "provider.payment"],
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

describe("CTA touchpoints contract (continuity)", () => {
  const roles = continuityRoles();

  it("manager org verification CTA bridges to ico_approve without ECO wording", () => {
    const actions = actionsFor("manager", "organization_verification", roles);
    const accept = actions.find((a) => a.id === "ico_form_accept");
    expect(accept).toBeTruthy();
    expect(accept!.label).not.toMatch(/внешн/i);
    expect(demoActionToCore(accept!.id)).toBe("ico_approve");
  });

  it("manager form verification CTA bridges to eco_accept", () => {
    const actions = actionsFor("manager", "form_verification", roles);
    const accept = actions.find((a) => a.id === "eco_form_accept");
    expect(accept).toBeTruthy();
    expect(accept!.label).not.toMatch(/внешн/i);
    expect(demoActionToCore(accept!.id)).toBe("eco_accept");
  });

  it("manager form verification includes reject/return CTA", () => {
    const actions = actionsFor("manager", "form_verification", roles);
    const reject = actions.find((a) => a.id === "eco_form_reject");
    expect(reject).toBeTruthy();
    expect(demoActionToCore(reject!.id)).toBe("eco_reject");
  });

  it("app-actions core ids stay aligned for continuity bridges", () => {
    expect(coreActionById("ico_approve")).toBe("ico_approve");
    expect(coreActionById("eco_accept")).toBe("eco_accept");
  });
});
