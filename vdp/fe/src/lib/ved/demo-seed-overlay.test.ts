import { describe, expect, it } from "vitest";

import {
  applyDemoSeedOverlay,
  DEMO_OVERLAY_EXTRA_FORM_NUMBER,
  demoSeedForms,
  demoSeedUsers,
} from "./demo-seed-overlay";
import { FORMS, USERS } from "./mock";

describe("demo seed overlay", () => {
  it("remaps bdui.local demo emails to demo.vdp.local", () => {
    const { users } = applyDemoSeedOverlay(USERS, FORMS);
    expect(users.some((u) => u.email.endsWith("@bdui.local"))).toBe(false);
    expect(users.find((u) => u.id === "u-10")?.email).toBe("manager2@demo.vdp.local");
    expect(users.find((u) => u.id === "u-11")?.email).toBe("provider2@demo.vdp.local");
  });

  it("appends the extra demo form once", () => {
    const first = applyDemoSeedOverlay(USERS, FORMS);
    expect(first.forms).toHaveLength(FORMS.length + 1);
    expect(first.forms.some((f) => f.number === DEMO_OVERLAY_EXTRA_FORM_NUMBER)).toBe(true);
    const second = applyDemoSeedOverlay(USERS, first.forms);
    expect(second.forms).toHaveLength(first.forms.length);
  });

  it("demoSeed helpers match overlay output", () => {
    expect(demoSeedUsers()).toEqual(applyDemoSeedOverlay(USERS, FORMS).users);
    expect(demoSeedForms()).toEqual(applyDemoSeedOverlay(USERS, FORMS).forms);
  });
});
