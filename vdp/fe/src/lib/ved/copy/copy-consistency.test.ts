import { describe, expect, it } from "vitest";

import { statusMeta } from "../statuses";
import { ROLE_FOCUS } from "./role-voice";
import {
  COPY_JOURNEY,
  ROOT_COPY_SNAPSHOT,
  ROLE_ENTITY_PRIMARY,
  collectAllCopyConsistencyIssues,
  collectBankRootBleedIssues,
  collectEntityPrimaryIssues,
  collectJourneyLabelMismatches,
  collectPaymentSentAlignmentIssues,
  collectProviderPiiIssues,
} from "./copy-consistency";

describe("RW9 copy consistency gate", () => {
  it("COPY_JOURNEY covers User→completed handoffs", () => {
    const phases = [...new Set(COPY_JOURNEY.map((s) => s.phase))];
    expect(phases).toContain("RD1");
    expect(phases).toContain("RD3-handoff");
    expect(phases).toContain("RD7-handoff");
    expect(phases).toContain("RD6-close");
  });

  it("journey status and action labels match copy layer", () => {
    const mismatches = collectJourneyLabelMismatches();
    expect(mismatches, mismatches.map((m) => m.detail).join("\n")).toEqual([]);
  });

  it("payment_sent reads consistently across user, manager, provider", () => {
    expect(collectPaymentSentAlignmentIssues()).toEqual([]);
    expect(statusMeta("payment_sent", "user").label).toBe("Платёж отправлен");
    expect(statusMeta("payment_sent", "manager").label).toBe("Платёж отправлен");
    expect(statusMeta("payment_sent", "provider").label).toBe("Платёж отправлен");
  });

  it("provider copy has no PII terms (P0)", () => {
    expect(collectProviderPiiIssues()).toEqual([]);
  });

  it("each role uses primary entity term in registry/close copy", () => {
    expect(collectEntityPrimaryIssues()).toEqual([]);
    expect(ROLE_ENTITY_PRIMARY.user.term).toBe("заявка");
    expect(ROLE_ENTITY_PRIMARY.compliance_officer.term).toBe("сделка");
    expect(ROLE_ENTITY_PRIMARY.provider.term).toBe("платеж");
  });

  it("form_accepted handoff: заявка (user) vs сделка (eco/manager) — intentional", () => {
    expect(statusMeta("form_accepted", "user").label).toContain("Заявка");
    expect(statusMeta("form_accepted", "compliance_officer").label).toContain("Сделка");
    expect(statusMeta("form_accepted", "manager").label).toContain("сопровожден");
  });

  it("root copy unchanged and separated from bank channel", () => {
    expect(ROLE_FOCUS.root).toBe(ROOT_COPY_SNAPSHOT.roleFocus);
    expect(collectBankRootBleedIssues()).toEqual([]);
  });

  it("aggregate gate: no P0 copy conflicts", () => {
    const all = [...collectAllCopyConsistencyIssues(), ...collectBankRootBleedIssues()];
    expect(all, all.map((i) => `[${i.rule}] ${i.detail}`).join("\n")).toEqual([]);
  });
});
