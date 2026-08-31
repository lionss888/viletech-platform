import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { resolveDemoAction } from "./action-bridge";
import { planContractConfirm } from "./manager-contract";

describe("planContractConfirm", () => {
  it("resolves branch on contract_waiting", () => {
    expect(planContractConfirm("contract_waiting")).toEqual({ kind: "resolve_branch" });
  });

  it("sends order on contract_verification without linked contract", () => {
    expect(planContractConfirm("contract_verification")).toEqual({ kind: "send_order" });
  });

  it("accepts linked contract then sends order on contract_verification", () => {
    expect(planContractConfirm("contract_verification", "c-1")).toEqual({
      kind: "accept_then_send_order",
      contractId: "c-1",
    });
  });
});

describe("manager contract/order bridge", () => {
  it("maps agent assign to side effect", () => {
    expect(resolveDemoAction("mgr_assign_agent")).toEqual({ kind: "assign_agent" });
  });

  it("maps contract attach to contract API side effect", () => {
    expect(resolveDemoAction("mgr_contract_attach")).toEqual({ kind: "contract_attach" });
    expect(resolveDemoAction("mgr_contract_confirm")).toEqual({ kind: "contract_resolve" });
    expect(resolveDemoAction("mgr_contract_return")).toEqual({ kind: "contract_return" });
  });

  it("maps order generate/verify transitions", () => {
    expect(resolveDemoAction("mgr_order_generate")).toEqual({
      kind: "transition",
      coreAction: "manager_send_order",
    });
    expect(resolveDemoAction("mgr_order_attach")).toEqual({
      kind: "file_then_transition",
      coreAction: "order_signing",
      docKind: "order",
    });
    expect(resolveDemoAction("mgr_order_start")).toEqual({ kind: "transition", coreAction: "order_start" });
    expect(resolveDemoAction("mgr_order_accept")).toEqual({ kind: "transition", coreAction: "order_accept" });
  });

  it("exposes manager CTAs from form_accepted through order verification", () => {
    const accepted = actionsFor("manager", "form_accepted").map((a) => a.id);
    expect(accepted).toContain("mgr_assign_agent");
    expect(accepted).toContain("mgr_contract_attach");

    const verification = actionsFor("manager", "contract_verification").map((a) => a.id);
    expect(verification).toContain("mgr_contract_confirm");
    expect(verification).toContain("mgr_order_generate");

    const orderQueue = actionsFor("manager", "signing_order_waiting_verification").map((a) => a.id);
    expect(orderQueue).toContain("mgr_order_start");

    const orderReview = actionsFor("manager", "signing_order_verification").map((a) => a.id);
    expect(orderReview).toContain("mgr_order_accept");
  });
});
