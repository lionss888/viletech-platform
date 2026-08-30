import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import { ECO_ACTION_LABELS, applyEcoActionLabels } from "./action-labels";
import { navLabelForRole } from "./nav-labels";
import {
  ECO_ACTION_PANEL,
  ECO_DASHBOARD,
  ECO_FORM_DETAIL,
  ECO_FORMS_LIST,
  ROLE_FOCUS,
  USER_CORRECTIONS_BANNER,
} from "./role-voice";
import { ECO_STATUS_LABELS } from "./status-labels";

describe("ECO copy layer", () => {
  it("maps form_waiting_verification for ECO", () => {
    expect(statusMeta("form_waiting_verification", "compliance_officer").label).toBe(
      "В очереди на проверку сделки",
    );
    expect(statusMeta("form_verification", "compliance_officer").label).toBe("На проверке сделки");
  });

  it("maps form_accepted for ECO", () => {
    expect(statusMeta("form_accepted", "compliance_officer").label).toBe("Сделка подтверждена");
    expect(statusMeta("form_accepted", "manager").label).toBe("Готова к сопровождению");
  });

  it("maps eco_form_start and eco_form_accept", () => {
    const start = actionsFor("compliance_officer", "form_waiting_verification").find(
      (a) => a.id === "eco_form_start",
    );
    const accept = actionsFor("compliance_officer", "form_verification").find((a) => a.id === "eco_form_accept");
    expect(start?.label).toBe("Взять сделку в проверку");
    expect(accept?.label).toBe("Подтвердить условия сделки");
  });

  it("maps eco_form_reject with deal wording", () => {
    const reject = actionsFor("compliance_officer", "form_verification").find((a) => a.id === "eco_form_reject");
    expect(reject?.label).toBe("Вернуть сделку на доработку");
    expect(reject?.requiresMark).toBe(true);
    expect(reject?.requiresReason).toBe(true);
  });

  it("preserves action ids", () => {
    const ids = actionsFor("compliance_officer", "form_verification").map((a) => a.id);
    expect(ids).toContain("eco_form_accept");
    expect(ids).toContain("eco_cancel");
  });

  it("overrides ECO nav labels", () => {
    expect(navLabelForRole("/forms", "Входящие заявки", "compliance_officer")).toBe("Входящие на проверку");
  });

  it("keeps ECO role focus from glossary", () => {
    expect(ROLE_FOCUS.compliance_officer).toBe("Внешняя проверка заявок и подтверждение условий сделки.");
  });

  it("covers glossary samples", () => {
    expect(ECO_STATUS_LABELS.form_waiting_corrections?.label).toBe("Возврат на доработку");
    expect(ECO_ACTION_LABELS.eco_form_accept?.label).toBe("Подтвердить условия сделки");
  });

  it("exposes reject path copy for user and ECO", () => {
    expect(USER_CORRECTIONS_BANNER.nextStep).toContain("Отправить исправления");
    expect(ECO_ACTION_PANEL.reasonPlaceholder).toContain("клиент");
    expect(ECO_FORM_DETAIL.correctionsPending).toContain("доработка");
  });

  it("exposes dashboard and forms list copy", () => {
    expect(ECO_DASHBOARD.tasksTitle).toBe("Сделки в вашей очереди");
    expect(ECO_FORMS_LIST.subtitle(3)).toContain("внешнего комплаенса");
  });

  it("applyEcoActionLabels preserves unknown actions", () => {
    const input = [{ id: "custom_action", label: "Original", tone: "quiet" as const }];
    expect(applyEcoActionLabels(input, "draft")[0]?.label).toBe("Original");
  });
});
