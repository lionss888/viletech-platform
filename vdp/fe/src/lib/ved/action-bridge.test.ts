import { describe, expect, it } from "vitest";

import { ALL_DEMO_ACTION_IDS, demoActionToCore, resolveDemoAction } from "./action-bridge";

describe("demoActionToCore", () => {
  it("maps user submit actions", () => {
    expect(demoActionToCore("accept_form")).toBe("submit");
    expect(demoActionToCore("accept_corrections")).toBe("submit");
  });

  it("maps compliance actions", () => {
    expect(demoActionToCore("ico_form_start")).toBe("ico_start");
    expect(demoActionToCore("eco_form_accept")).toBe("eco_accept");
  });

  it("maps manager actions", () => {
    expect(demoActionToCore("mgr_order_start")).toBe("order_start");
    expect(demoActionToCore("mgr_completed")).toBe("complete");
    expect(demoActionToCore("mgr_cancel")).toBe("cancel_by_manager");
  });

  it("maps provider actions", () => {
    expect(demoActionToCore("prov_payment_sent")).toBe("provider_sent");
    expect(demoActionToCore("prov_payment_start")).toBe("provider_start");
  });

  it("returns undefined for unknown ids", () => {
    expect(demoActionToCore("unknown_action_xyz")).toBeUndefined();
  });
});

describe("resolveDemoAction", () => {
  it("resolves all matrix action ids", () => {
    const missing: string[] = [];
    for (const id of ALL_DEMO_ACTION_IDS) {
      if (!resolveDemoAction(id)) missing.push(id);
    }
    expect(missing, `unmapped: ${missing.join(", ")}`).toEqual([]);
  });

  it("assign provider is side effect", () => {
    expect(resolveDemoAction("mgr_assign_provider")).toEqual({ kind: "assign_provider" });
  });

  it("contract attach is side effect not file transition", () => {
    expect(resolveDemoAction("mgr_contract_attach")).toEqual({ kind: "contract_attach" });
    expect(resolveDemoAction("mgr_contract_attach")?.kind).not.toBe("file_then_transition");
    expect(resolveDemoAction("mgr_contract_confirm")).toEqual({ kind: "contract_resolve" });
    expect(resolveDemoAction("mgr_contract_return")).toEqual({ kind: "contract_return" });
  });

  it("refund init is side effect", () => {
    expect(resolveDemoAction("mgr_refund_init")).toEqual({ kind: "refund_init" });
  });

  it("user upload_contract maps to user_upload_contract", () => {
    expect(resolveDemoAction("upload_contract")).toEqual({
      kind: "file_then_transition",
      coreAction: "user_upload_contract",
      docKind: "contract",
    });
  });

  it("user upload_payments is file attach without manager payment_received", () => {
    expect(resolveDemoAction("upload_payments")).toEqual({ kind: "file_attach", docKind: "payment" });
  });

  it("provider attach proof is confirmation side effect", () => {
    expect(resolveDemoAction("prov_attach_proof")).toEqual({ kind: "set_confirmation" });
  });

  it("user order/report/shipment uploads map to user core actions", () => {
    expect(resolveDemoAction("upload_order")).toEqual({
      kind: "file_then_transition",
      coreAction: "user_upload_order",
      docKind: "order",
    });
    expect(resolveDemoAction("upload_report")?.kind).toBe("file_then_transition");
    expect(resolveDemoAction("upload_shipment")?.kind).toBe("file_then_transition");
  });
});
