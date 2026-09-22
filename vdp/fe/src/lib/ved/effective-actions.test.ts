import { describe, expect, it } from "vitest";

import { effectiveActionsFor, effectiveActionsFormCtx } from "./effective-actions";

describe("effectiveActionsFor", () => {
  it("hides mgr_payment_start on import advance payment_received", () => {
    const ctx = effectiveActionsFormCtx({
      status: "payment_received",
      direction: "import",
      condition: "advance",
    });
    const ids = effectiveActionsFor("manager", ctx).map((a) => a.id);
    expect(ids).not.toContain("mgr_payment_start");
    expect(ids).toContain("mgr_assign_provider");
  });

  it("drops mgr_assign_provider when providerId is set", () => {
    const base = effectiveActionsFormCtx({
      status: "payment_received",
      direction: "import",
      condition: "postPayment",
    });
    expect(effectiveActionsFor("manager", base).map((a) => a.id)).toContain("mgr_assign_provider");
    const assigned = effectiveActionsFormCtx({
      status: "payment_received",
      direction: "import",
      condition: "postPayment",
      providerId: "prov-1",
    });
    expect(effectiveActionsFor("manager", assigned).map((a) => a.id)).not.toContain("mgr_assign_provider");
    expect(effectiveActionsFor("manager", assigned).map((a) => a.id)).toContain("mgr_payment_start");
  });

  it("lists treasurer confirm on import advance payment_received", () => {
    const ctx = effectiveActionsFormCtx({
      status: "payment_received",
      direction: "import",
      condition: "advance",
    });
    expect(effectiveActionsFor("treasurer", ctx).map((a) => a.id)).toContain("treas_confirm_payment");
  });
});
