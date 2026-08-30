import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import {
  MANAGER_CLOSE_ACTION_LABELS,
  MANAGER_CLOSE_FORM_DETAIL,
  MANAGER_CLOSE_STATUS_LABELS,
  MANAGER_DASHBOARD,
  MANAGER_STAGE_LABELS,
  applyManagerCloseActionLabels,
  isManagerClosePhaseStatus,
  managerCloseReasonFields,
  managerStageLabel,
} from "./manager-close-copy";

describe("Manager report & close copy (RW6)", () => {
  it("maps report statuses for manager", () => {
    expect(statusMeta("report_waiting", "manager").label).toBe("Отчёт агента на подписи у клиента");
    expect(statusMeta("report_verification", "manager").label).toBe("Отчёт агента на проверке");
    expect(statusMeta("report_accepted", "manager").label).toBe("Отчёт агента принят");
  });

  it("maps shipment statuses for manager", () => {
    expect(statusMeta("shipment_waiting", "manager").label).toBe("Ждём документы об отгрузке");
    expect(statusMeta("shipment_verification", "manager").label).toBe("Документы об отгрузке на проверке");
  });

  it("maps completed status for manager", () => {
    expect(statusMeta("completed", "manager").label).toBe("Сделка закрыта");
  });

  it("maps mgr_report_* actions with confirms", () => {
    const sent = actionsFor("manager", "payment_sent");
    expect(sent.find((a) => a.id === "mgr_report_signing")?.label).toBe("Отправить отчёт агента на подпись");
    expect(sent.find((a) => a.id === "mgr_report_signing")?.confirm).toContain("подпись");

    const review = actionsFor("manager", "report_verification");
    expect(review.find((a) => a.id === "mgr_report_accept")?.label).toBe("Принять отчёт агента");
    expect(review.find((a) => a.id === "mgr_report_reject")?.label).toContain("доработку");
  });

  it("maps mgr_shipment_* and mgr_completed", () => {
    expect(actionsFor("manager", "report_accepted").find((a) => a.id === "mgr_shipment_waiting")?.label).toBe(
      "Перейти к документам об отгрузке",
    );
    expect(actionsFor("manager", "shipment_verification").find((a) => a.id === "mgr_completed")?.label).toBe(
      "Закрыть сделку",
    );
    expect(actionsFor("manager", "shipment_verification").find((a) => a.id === "mgr_completed")?.confirm).toContain(
      "сопровождение",
    );
  });

  it("does not override payment actions (RW5 scope)", () => {
    expect(actionsFor("manager", "payment_received").find((a) => a.id === "mgr_assign_provider")?.label).toBe(
      "Назначить провайдера исполнения",
    );
  });

  it("preserves action ids", () => {
    const ids = actionsFor("manager", "shipment_verification").map((a) => a.id);
    expect(ids).toContain("mgr_completed");
    expect(ids).toContain("mgr_shipment_reject");
  });

  it("covers glossary samples", () => {
    expect(MANAGER_CLOSE_STATUS_LABELS.report_waiting?.label).toContain("подписи");
    expect(MANAGER_CLOSE_ACTION_LABELS.mgr_completed?.label).toBe("Закрыть сделку");
    expect(MANAGER_CLOSE_FORM_DETAIL.actionPanelTitle).toContain("отчёт");
  });

  it("exposes dashboard and stage labels", () => {
    expect(MANAGER_DASHBOARD.closedDeals).toBe("Сделок закрыто");
    expect(MANAGER_STAGE_LABELS.agent_report).toBe("Отчёт агента");
    expect(managerStageLabel("shipment")).toBe("Отгрузка");
  });

  it("exposes report and shipment reject reason fields", () => {
    expect(managerCloseReasonFields("mgr_report_reject")?.label).toContain("отчёт");
    expect(managerCloseReasonFields("mgr_shipment_reject")?.placeholder).toContain("отгрузке");
  });

  it("applyManagerCloseActionLabels preserves unknown actions", () => {
    const input = [{ id: "mgr_payment_start", label: "Original", tone: "quiet" as const }];
    expect(applyManagerCloseActionLabels(input, "payment_received")[0]?.label).toBe("Original");
  });

  it("isManagerClosePhaseStatus covers report/shipment/completed branch", () => {
    expect(isManagerClosePhaseStatus("report_waiting")).toBe(true);
    expect(isManagerClosePhaseStatus("shipment_verification")).toBe(true);
    expect(isManagerClosePhaseStatus("completed")).toBe(true);
    expect(isManagerClosePhaseStatus("payment_sent")).toBe(false);
  });
});
