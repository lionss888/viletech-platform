import { describe, expect, it } from "vitest";

import { SCENARIO_IDS, UI_SCENARIO_SPECS } from "./scenario-catalog";

describe("scenario-catalog mirror", () => {
  it("exposes required catalog ids", () => {
    expect(SCENARIO_IDS.happyPathToCompleted).toBe("happy_path_to_completed");
    expect(SCENARIO_IDS.providerPaymentNoPii).toBe("provider_payment_no_pii");
    expect(SCENARIO_IDS.healthCore).toBe("health_core");
  });

  it("maps UI scenarios to playwright specs", () => {
    expect(UI_SCENARIO_SPECS[SCENARIO_IDS.providerPaymentNoPii]).toContain("provider-acl");
    expect(UI_SCENARIO_SPECS[SCENARIO_IDS.ecoRejectResubmit]).toContain("reject-path");
  });
});
