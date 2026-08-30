import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import {
  MANAGER_CONTRACT_ACTION_LABELS,
  MANAGER_CONTRACT_ACTION_PANEL,
  MANAGER_CONTRACT_FORM_DETAIL,
  MANAGER_CONTRACT_STATUS_LABELS,
  applyManagerContractActionLabels,
  isManagerContractPhaseStatus,
  managerContractReasonFields,
} from "./manager-contract-copy";

describe("Manager contract & order copy (RW4)", () => {
  it("maps contract-phase statuses for manager", () => {
    expect(statusMeta("form_accepted", "manager").label).toBe("Готова к сопровождению");
    expect(statusMeta("contract_waiting", "manager").label).toBe("Ждём договор от клиента");
    expect(statusMeta("contract_verification", "manager").label).toBe("Агентский договор на проверке");
    expect(statusMeta("signing_order_accepted", "manager").label).toBe("Поручение принято");
  });

  it("does not override payment statuses for manager (RW5 layer)", () => {
    expect(statusMeta("payment_received", "manager").label).toBe("ДС получены");
  });

  it("maps mgr_assign_agent and mgr_contract_attach", () => {
    const accepted = actionsFor("manager", "form_accepted");
    expect(accepted.find((a) => a.id === "mgr_assign_agent")?.label).toBe("Назначить агента по сделке");
    expect(accepted.find((a) => a.id === "mgr_contract_attach")?.label).toBe("Прикрепить агентский договор");
    expect(accepted.find((a) => a.id === "mgr_assign_agent")?.confirm).toContain("агента");
  });

  it("maps contract confirm by status", () => {
    const waiting = actionsFor("manager", "contract_waiting").find((a) => a.id === "mgr_contract_confirm");
    const verification = actionsFor("manager", "contract_verification").find((a) => a.id === "mgr_contract_confirm");
    expect(waiting?.label).toBe("Проверить загруженный договор");
    expect(verification?.label).toBe("Подтвердить агентский договор");
    expect(verification?.confirm).toContain("поручен");
  });

  it("maps order actions with confirms", () => {
    const verification = actionsFor("manager", "contract_verification");
    expect(verification.find((a) => a.id === "mgr_order_generate")?.label).toBe("Сформировать поручение принципала");
    expect(verification.find((a) => a.id === "mgr_order_generate")?.confirm).toContain("подпись");

    const orderCheck = actionsFor("manager", "signing_order_verification");
    expect(orderCheck.find((a) => a.id === "mgr_order_accept")?.label).toBe("Принять поручение принципала");
    expect(orderCheck.find((a) => a.id === "mgr_order_accept")?.confirm).toContain("средств");
  });

  it("preserves report action labels outside RW4 scope", () => {
    const sent = actionsFor("manager", "payment_sent");
    expect(sent.find((a) => a.id === "mgr_report_signing")?.label).toBe("Отправить отчёт агента на подпись");
  });

  it("preserves action ids", () => {
    const ids = actionsFor("manager", "form_accepted").map((a) => a.id);
    expect(ids).toContain("mgr_assign_agent");
    expect(ids).toContain("mgr_contract_attach");
    expect(ids).toContain("mgr_form_reject");
  });

  it("covers glossary samples in maps", () => {
    expect(MANAGER_CONTRACT_STATUS_LABELS.signing_order?.label).toContain("подписи");
    expect(MANAGER_CONTRACT_ACTION_LABELS.mgr_order_generate?.label).toBe("Сформировать поручение принципала");
    expect(MANAGER_CONTRACT_FORM_DETAIL.actionPanelTitle).toContain("договор");
  });

  it("exposes action panel copy for assign agent and contract return", () => {
    expect(MANAGER_CONTRACT_ACTION_PANEL.assignAgentLabel).toContain("агент");
    const reason = managerContractReasonFields("mgr_contract_return");
    expect(reason?.placeholder).toContain("клиент");
  });

  it("applyManagerContractActionLabels preserves unknown actions", () => {
    const input = [{ id: "mgr_report_signing", label: "Original", tone: "quiet" as const }];
    expect(applyManagerContractActionLabels(input, "payment_sent")[0]?.label).toBe("Original");
  });

  it("isManagerContractPhaseStatus covers contract and order branch", () => {
    expect(isManagerContractPhaseStatus("form_accepted")).toBe(true);
    expect(isManagerContractPhaseStatus("signing_order_accepted")).toBe(true);
    expect(isManagerContractPhaseStatus("payment_received")).toBe(false);
  });
});
