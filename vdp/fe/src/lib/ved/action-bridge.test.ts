import { describe, expect, it } from "vitest";

import { resolveCoreAction } from "./app-actions";
import { nestRoleFor } from "./action-bridge";

describe("action-bridge", () => {
  it("maps accept_form to submit", () => {
    expect(resolveCoreAction("accept_form")).toBe("submit");
  });

  it("maps ico_form_start to ico_start", () => {
    expect(resolveCoreAction("ico_form_start")).toBe("ico_start");
  });

  it("maps manager payment received", () => {
    expect(resolveCoreAction("mgr_payment_received")).toBe("payment_received");
  });

  it("resolves nest role prefixes", () => {
    expect(nestRoleFor("internal_compliance_officer")).toBe("ico");
    expect(nestRoleFor("manager")).toBe("manager");
  });
});
