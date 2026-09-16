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

  it("rebuilds seed timelines on the happy-path rail without a shipment stage", () => {
    const completed = demoSeedForms().find((form) => form.status === "completed");
    expect(completed).toBeDefined();
    expect(completed?.timeline.some((entry) => entry.id.endsWith("-tl-shipment"))).toBe(false);
    expect(completed?.timeline.some((entry) => entry.id.endsWith("-tl-agent_report"))).toBe(true);
  });

  it("inserts shipment into overlay timelines only for shipment_* seed forms", () => {
    const rawWaiting = FORMS.find((form) => form.status === "shipment_waiting");
    expect(rawWaiting?.timeline.some((entry) => entry.id.endsWith("-tl-shipment"))).toBe(false);
    const waiting = demoSeedForms().find((form) => form.status === "shipment_waiting");
    expect(waiting).toBeDefined();
    const ids = waiting?.timeline.map((entry) => entry.id) ?? [];
    const reportIdx = ids.findIndex((id) => id.endsWith("-tl-agent_report"));
    const shipIdx = ids.findIndex((id) => id.endsWith("-tl-shipment"));
    const doneIdx = ids.findIndex((id) => id.endsWith("-tl-completed"));
    expect(shipIdx).toBeGreaterThan(reportIdx);
    expect(doneIdx).toBeGreaterThan(shipIdx);
  });
});
