import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import { applyUserActionLabels, USER_ACTION_LABELS } from "./action-labels";
import { navLabelForRole } from "./nav-labels";
import { ROLE_FOCUS, USER_FORMS_LIST, USER_STATUS_FILTERS } from "./role-voice";
import { USER_STATUS_LABELS } from "./status-labels";

describe("user copy layer", () => {
  it("maps draft status to user glossary label", () => {
    expect(statusMeta("draft", "user").label).toBe("Черновик заявки");
    expect(statusMeta("draft", "manager").label).toBe("Черновик");
  });

  it("maps form_waiting_corrections for user", () => {
    expect(statusMeta("form_waiting_corrections", "user").label).toBe("Нужны исправления");
  });

  it("maps accept_form action for user role", () => {
    const submit = actionsFor("user", "draft").find((a) => a.id === "accept_form");
    expect(submit?.label).toBe("Отправить заявку на проверку");
  });

  it("maps upload branch actions for user", () => {
    expect(actionsFor("user", "contract_waiting")[0]?.label).toBe("Загрузить подписанный агентский договор");
    expect(actionsFor("user", "report_waiting")[0]?.label).toBe("Загрузить подписанный отчёт агента");
    expect(actionsFor("user", "shipment_waiting")[0]?.label).toBe("Загрузить документы об отгрузке");
  });

  it("does not change action ids", () => {
    const ids = actionsFor("user", "draft").map((a) => a.id);
    expect(ids).toContain("accept_form");
  });

  it("overrides nav label for user forms segment", () => {
    expect(navLabelForRole("/forms", "Реестр заявок", "user")).toBe("Мои заявки");
    expect(navLabelForRole("/forms", "Реестр заявок", "manager")).toBe("Реестр заявок");
  });

  it("keeps role focus from glossary", () => {
    expect(ROLE_FOCUS.user).toBe("Ваши сделки, документы к загрузке и статусы платежей.");
  });

  it("covers glossary status samples", () => {
    expect(USER_STATUS_LABELS.form_accepted?.label).toBe("Заявка принята");
    expect(USER_STATUS_LABELS.completed?.label).toBe("Сделка закрыта");
    expect(USER_STATUS_LABELS.contract_waiting?.label).toBe("Подпишите агентский договор");
  });

  it("covers upload action labels in copy map", () => {
    expect(USER_ACTION_LABELS.upload_order?.label).toContain("поручение");
    expect(USER_ACTION_LABELS.upload_payments?.label).toContain("платёжное поручение");
  });

  it("maps correction upload labels by status", () => {
    expect(actionsFor("user", "contract_waiting_correction")[0]?.label).toBe("Загрузить исправленный агентский договор");
    expect(actionsFor("user", "signing_order_waiting_corrections")[0]?.label).toBe("Загрузить исправленное поручение");
  });

  it("applyUserActionLabels preserves unknown actions", () => {
    const input = [{ id: "custom_action", label: "Original", tone: "quiet" as const }];
    expect(applyUserActionLabels(input, "draft")[0]?.label).toBe("Original");
  });

  it("exposes user forms list copy", () => {
    expect(USER_FORMS_LIST.title).toBe("Мои заявки");
    expect(USER_STATUS_FILTERS.compliance).toBe("На проверке");
  });
});
