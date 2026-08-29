import { describe, expect, it } from "vitest";

import { rejectFromHistory } from "@/lib/api/mappers";
import { actionsFor } from "./actions";
import { resolveDemoAction } from "./action-bridge";

describe("ECO actions", () => {
  it("exposes start on form_waiting_verification", () => {
    const actions = actionsFor("compliance_officer", "form_waiting_verification");
    expect(actions.map((a) => a.id)).toContain("eco_form_start");
    expect(resolveDemoAction("eco_form_start")).toEqual({ kind: "transition", coreAction: "eco_start" });
  });

  it("exposes accept/reject with reason+mark on form_verification", () => {
    const actions = actionsFor("compliance_officer", "form_verification");
    const accept = actions.find((a) => a.id === "eco_form_accept");
    const reject = actions.find((a) => a.id === "eco_form_reject");
    expect(accept).toBeDefined();
    expect(reject?.requiresReason).toBe(true);
    expect(reject?.requiresMark).toBe(true);
    expect(resolveDemoAction("eco_form_accept")).toEqual({ kind: "transition", coreAction: "eco_accept" });
    expect(resolveDemoAction("eco_form_reject")).toEqual({ kind: "transition", coreAction: "eco_reject" });
  });

  it("user can resubmit from form_waiting_corrections", () => {
    const actions = actionsFor("user", "form_waiting_corrections");
    expect(actions.some((a) => a.id === "accept_corrections")).toBe(true);
    expect(resolveDemoAction("accept_corrections")).toEqual({ kind: "transition", coreAction: "submit" });
  });
});

describe("rejectFromHistory", () => {
  it("parses mark · reason from corrections transition", () => {
    const actual = rejectFromHistory([
      {
        id: "1",
        form_payment_id: "f",
        actor_id: "eco",
        from_status: "form_verification",
        to_status: "form_waiting_corrections",
        comment: "Некорректный инвойс · приложите новый PDF",
        created_at: "2026-08-29T00:00:00Z",
      },
    ]);
    expect(actual).toEqual({
      rejectMark: "Некорректный инвойс",
      rejectText: "приложите новый PDF",
    });
  });
});
