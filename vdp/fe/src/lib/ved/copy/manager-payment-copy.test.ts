import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import {
  MANAGER_PAYMENT_ACTION_LABELS,
  MANAGER_PAYMENT_ACTION_PANEL,
  MANAGER_PAYMENT_FORM_DETAIL,
  MANAGER_PAYMENT_PROVIDER_LOCK,
  MANAGER_PAYMENT_STATUS_LABELS,
  MANAGER_REFUND_PANEL,
  applyManagerPaymentActionLabels,
  isManagerPaymentPhaseStatus,
  managerPaymentReasonFields,
} from "./manager-payment-copy";

describe("Manager payment & refund copy (RW5)", () => {
  it("maps payment statuses for manager", () => {
    expect(statusMeta("payment_received", "manager").label).toBe("ДС получены");
    expect(statusMeta("payment_processing", "manager").label).toBe("В исполнении у провайдера");
    expect(statusMeta("payment_sent", "manager").label).toBe("Платёж отправлен");
    expect(statusMeta("manager_checking", "manager").label).toBe("Платёж на уточнении у провайдера");
  });

  it("maps refund statuses with ДС wording", () => {
    expect(statusMeta("payment_refund_waiting", "manager").label).toBe("Возврат ДС инициирован");
    expect(statusMeta("payment_refund_processing", "manager").label).toBe("Возврат ДС в процессе");
    expect(statusMeta("payment_refund_sent", "manager").label).toBe("Возврат ДС завершён");
  });

  it("maps mgr_assign_provider and payment_start on payment_received", () => {
    const actions = actionsFor("manager", "payment_received");
    expect(actions.find((a) => a.id === "mgr_assign_provider")?.label).toBe("Назначить провайдера исполнения");
    expect(actions.find((a) => a.id === "mgr_assign_deadline")?.label).toBe("Установить срок исполнения");
    expect(actions.find((a) => a.id === "mgr_payment_start")?.label).toBe("Передать в исполнение");
    expect(actions.find((a) => a.id === "mgr_payment_start")?.confirm).toContain("провайдер");
  });

  it("maps mgr_payment_received on signing_order_accepted", () => {
    const action = actionsFor("manager", "signing_order_accepted").find((a) => a.id === "mgr_payment_received");
    expect(action?.label).toBe("Подтвердить получение ДС");
    expect(action?.confirm).toContain("денежных средств");
  });

  it("maps refund actions with ДС terminology", () => {
    expect(actionsFor("manager", "payment_received").find((a) => a.id === "mgr_refund_init")?.label).toBe(
      "Инициировать возврат ДС",
    );
    expect(actionsFor("manager", "payment_refund_waiting").find((a) => a.id === "mgr_refund_start")?.label).toBe(
      "Запустить возврат ДС",
    );
    expect(actionsFor("manager", "payment_refund_processing").find((a) => a.id === "mgr_refund_sent")?.label).toBe(
      "Подтвердить возврат ДС",
    );
  });

  it("maps manager_checking payment_start separately", () => {
    const action = actionsFor("manager", "manager_checking").find((a) => a.id === "mgr_payment_start");
    expect(action?.label).toBe("Вернуть в исполнение");
  });

  it("does not override report/close actions (RW6 scope)", () => {
    const sent = actionsFor("manager", "payment_sent");
    expect(sent.find((a) => a.id === "mgr_report_signing")?.label).toBe("Отправить отчёт агента на подпись");
  });

  it("covers glossary samples", () => {
    expect(MANAGER_PAYMENT_STATUS_LABELS.payment_received?.label).toBe("ДС получены");
    expect(MANAGER_PAYMENT_ACTION_LABELS.mgr_refund_init?.label).toBe("Инициировать возврат ДС");
    expect(MANAGER_PAYMENT_PROVIDER_LOCK).toContain("провайдера исполнения");
  });

  it("exposes refund panel and action panel copy", () => {
    expect(MANAGER_REFUND_PANEL.title).toContain("денежных средств");
    expect(MANAGER_REFUND_PANEL.apiStatusLabels.payment_refund_sent).toContain("ДС");
    expect(MANAGER_PAYMENT_FORM_DETAIL.actionPanelTitle).toContain("возврат");
    expect(MANAGER_PAYMENT_ACTION_PANEL.refundAmountLabel).toContain("ДС");
  });

  it("exposes refund init reason fields", () => {
    const fields = managerPaymentReasonFields("mgr_refund_init");
    expect(fields?.label).toContain("ДС");
    expect(fields?.placeholder).toContain("клиент");
  });

  it("applyManagerPaymentActionLabels preserves unknown actions", () => {
    const input = [{ id: "mgr_report_signing", label: "Original", tone: "quiet" as const }];
    expect(applyManagerPaymentActionLabels(input, "payment_sent")[0]?.label).toBe("Original");
  });

  it("isManagerPaymentPhaseStatus covers payment and refund branch", () => {
    expect(isManagerPaymentPhaseStatus("payment_received")).toBe(true);
    expect(isManagerPaymentPhaseStatus("payment_refund_sent")).toBe(true);
    expect(isManagerPaymentPhaseStatus("form_accepted")).toBe(false);
  });
});
