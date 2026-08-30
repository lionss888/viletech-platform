import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import { ICO_ACTION_LABELS, applyIcoActionLabels } from "./action-labels";
import { navLabelForRole } from "./nav-labels";
import { ICO_DASHBOARD, ICO_FORM_DETAIL, ICO_ORGANIZATIONS, ICO_SUBJECT_REVIEW, ROLE_FOCUS } from "./role-voice";
import { ICO_STATUS_LABELS } from "./status-labels";

describe("ICO copy layer", () => {
  it("maps organization queue status for ICO", () => {
    expect(statusMeta("organization_waiting_verification", "internal_compliance_officer").label).toBe(
      "В очереди на верификацию организации",
    );
    expect(statusMeta("organization_verification", "internal_compliance_officer").label).toBe(
      "На верификации организации",
    );
  });

  it("maps form_waiting_corrections for ICO", () => {
    expect(statusMeta("form_waiting_corrections", "internal_compliance_officer").label).toBe("Возврат на доработку");
  });

  it("does not change status labels for manager", () => {
    expect(statusMeta("organization_waiting_verification", "manager").label).toBe(
      "Ожидает проверки организации",
    );
  });

  it("maps ico_form_start and ico_form_accept actions", () => {
    const start = actionsFor("internal_compliance_officer", "organization_waiting_verification").find(
      (a) => a.id === "ico_form_start",
    );
    const accept = actionsFor("internal_compliance_officer", "organization_verification").find(
      (a) => a.id === "ico_form_accept",
    );
    expect(start?.label).toBe("Взять организацию/заявку в проверку");
    expect(accept?.label).toBe("Одобрить и передать дальше");
  });

  it("preserves action ids", () => {
    const ids = actionsFor("internal_compliance_officer", "organization_verification").map((a) => a.id);
    expect(ids).toContain("ico_form_accept");
    expect(ids).toContain("ico_cancel");
  });

  it("overrides ICO nav labels", () => {
    expect(navLabelForRole("/forms", "Входящие заявки", "internal_compliance_officer")).toBe("Входящие на проверку");
    expect(navLabelForRole("/forms", "Входящие заявки", "compliance_officer")).toBe("Входящие на проверку");
    expect(navLabelForRole("/forms", "Входящие заявки", "manager")).toBe("Входящие заявки");
  });

  it("keeps ICO role focus from glossary", () => {
    expect(ROLE_FOCUS.internal_compliance_officer).toBe(
      "Проверка организаций и заявок перед запуском сделки.",
    );
  });

  it("covers glossary status and action samples", () => {
    expect(ICO_STATUS_LABELS.form_accepted?.label).toBe("Сделка подтверждена");
    expect(ICO_ACTION_LABELS.ico_form_start?.label).toContain("проверку");
  });

  it("exposes form detail lock notes", () => {
    expect(ICO_FORM_DETAIL.lockNote).toContain("заблокирована");
    expect(ICO_FORM_DETAIL.orgPendingNote).toContain("верификацию");
  });

  it("exposes organizations page copy", () => {
    expect(ICO_ORGANIZATIONS.title).toBe("Проверка организаций");
    expect(ICO_DASHBOARD.incomingForms).toBe("Входящие на проверку");
  });

  it("exposes subject review ICO verdicts", () => {
    expect(ICO_SUBJECT_REVIEW.verdicts.approved.label).toBe("Одобрить");
    expect(ICO_SUBJECT_REVIEW.verdicts.waiting_verification.label).toBe("Запросить документы");
  });

  it("applyIcoActionLabels preserves unknown actions", () => {
    const input = [{ id: "custom_action", label: "Original", tone: "quiet" as const }];
    expect(applyIcoActionLabels(input, "draft")[0]?.label).toBe("Original");
  });
});
