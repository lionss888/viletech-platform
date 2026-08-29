import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { resolveDemoAction } from "./action-bridge";
import { isActive } from "./health";

describe("rootActions", () => {
  it("merges operational CTAs on payment_received", () => {
    const ids = actionsFor("root", "payment_received").map((a) => a.id);
    expect(ids).toContain("mgr_payment_start");
    expect(ids).toContain("prov_payment_start");
    expect(ids).toContain("root_cancel_form");
  });

  it("adds root cancel only on active statuses", () => {
    expect(actionsFor("root", "draft").some((a) => a.id === "root_cancel_form")).toBe(true);
    expect(actionsFor("root", "completed").some((a) => a.id === "root_cancel_form")).toBe(false);
    expect(actionsFor("root", "canceled_by_manager").some((a) => a.id === "root_cancel_form")).toBe(false);
  });

  it("root cancel maps to cancel_by_manager with reason", () => {
    const cancel = actionsFor("root", "form_accepted").find((a) => a.id === "root_cancel_form");
    expect(cancel?.requiresReason).toBe(true);
    expect(cancel?.tone).toBe("danger");
    expect(resolveDemoAction("root_cancel_form")).toEqual({
      kind: "transition",
      coreAction: "cancel_by_manager",
    });
  });

  it("manager on same status has subset without root cancel", () => {
    const managerIds = actionsFor("manager", "form_accepted").map((a) => a.id);
    const rootIds = actionsFor("root", "form_accepted").map((a) => a.id);
    expect(rootIds.length).toBeGreaterThan(managerIds.length);
    expect(rootIds).toContain("root_cancel_form");
    expect(managerIds).not.toContain("root_cancel_form");
  });
});

describe("root dashboard stats", () => {
  it("completed forms are not active", () => {
    expect(isActive({ status: "completed" } as never)).toBe(false);
    expect(isActive({ status: "payment_processing" } as never)).toBe(true);
  });
});
