import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { resolveDemoAction } from "./action-bridge";

const USER_UPLOAD_STATUSES = [
  "contract_waiting",
  "contract_waiting_correction",
  "signing_order",
  "signing_order_waiting_corrections",
  "advance_signing_order",
  "advance_signing_order_waiting_corrections",
  "signing_order_accepted",
  "report_waiting",
  "report_waiting_corrections",
  "shipment_waiting",
  "shipment_waiting_corrections",
] as const;

describe("user upload CTAs", () => {
  it("exposes requiresFile upload action for each user.* status", () => {
    for (const status of USER_UPLOAD_STATUSES) {
      const actions = actionsFor("user", status);
      const upload = actions.find((a) => a.id.startsWith("upload_"));
      expect(upload, `missing upload CTA for ${status}`).toBeDefined();
      expect(upload?.requiresFile).toBe(true);
      expect(resolveDemoAction(upload!.id)).toBeDefined();
    }
  });

  it("draft submit CTA maps to core submit", () => {
    const actions = actionsFor("user", "draft");
    expect(actions.some((a) => a.id === "accept_form")).toBe(true);
    expect(resolveDemoAction("accept_form")).toEqual({ kind: "transition", coreAction: "submit" });
  });
});
