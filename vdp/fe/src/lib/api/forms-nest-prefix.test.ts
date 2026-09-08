import { describe, expect, it } from "vitest";

import { nestFormPrefixForRole } from "@/lib/api/forms";

describe("nestFormPrefixForRole", () => {
  it("maps cabinet roles to nest form-payment prefixes", () => {
    expect(nestFormPrefixForRole("user")).toBe("site");
    expect(nestFormPrefixForRole("manager")).toBe("manager");
    expect(nestFormPrefixForRole("root")).toBe("admin");
    expect(nestFormPrefixForRole("internal_compliance_officer")).toBe("ico");
  });
});
