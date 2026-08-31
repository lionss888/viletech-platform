import { describe, expect, it } from "vitest";

import { appActionsFor } from "./app-actions";
import { resolveCoreAction } from "./app-actions";

const JOURNEY = [
  ["user", "draft", "accept_form", "submit"],
  ["internal_compliance_officer", "organization_waiting_verification", "ico_form_start", "ico_start"],
  ["compliance_officer", "form_waiting_verification", "eco_form_start", "eco_start"],
  ["manager", "payment_received", "mgr_payment_start", "payment_start"],
  ["provider", "payment_processing", "prov_payment_sent", "provider_sent"],
] as const;

describe("integration-journey", () => {
  it.each(JOURNEY)("role %s status %s action %s → %s", (role, status, uiId, core) => {
    const actions = appActionsFor(role, status);
    expect(actions.some((a) => a.id === uiId)).toBe(true);
    expect(resolveCoreAction(uiId)).toBe(core);
  });
});
