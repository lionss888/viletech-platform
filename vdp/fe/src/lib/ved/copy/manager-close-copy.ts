import type { FormAction, FormStatus, StageId } from "../types";
import { applyManagerContractActionLabels } from "./manager-contract-copy";
import { applyManagerPaymentActionLabels } from "./manager-payment-copy";
import type { ActionCopy, RoleStatusLabel } from "./status-labels";

/** Manager: report, shipment, close phase. Glossary column «manager». */
export const MANAGER_CLOSE_STATUS_LABELS: Partial<Record<FormStatus, RoleStatusLabel>> = {
  report_waiting: { label: "Отчёт агента на подписи у клиента", short: "Подпись отчёта" },
  report_waiting_diadoc: { label: "Отчёт агента в ЭДО", short: "ЭДО" },
  report_waiting_verification: { label: "Отчёт в очереди на проверку", short: "Очередь отчёта" },
  report_waiting_corrections: { label: "Отчёт на доработке у клиента", short: "Коррекция отчёта" },
  report_verification: { label: "Отчёт агента на проверке", short: "Проверка отчёта" },
  report_accepted: { label: "Отчёт агента принят", short: "Отчёт принят" },

  shipment_waiting: { label: "Ждём документы об отгрузке", short: "Ожидание отгрузки" },
  shipment_waiting_verification: { label: "Отгрузка в очереди на проверку", short: "Очередь отгрузки" },
  shipment_waiting_corrections: { label: "Отгрузка на доработке у клиента", short: "Коррекция отгрузки" },
  shipment_verification: { label: "Документы об отгрузке на проверке", short: "Проверка отгрузки" },

  completed: { label: "Сделка закрыта", short: "Закрыта" },
};

export const MANAGER_CLOSE_ACTION_LABELS: Record<string, ActionCopy> = {
  mgr_report_signing: {
    label: "Отправить отчёт агента на подпись",
    confirm: "Отправить отчёт агента клиенту на подпись?",
  },
  mgr_report_start: { label: "Взять отчёт агента в проверку" },
  mgr_report_accept: {
    label: "Принять отчёт агента",
    confirm: "Принять отчёт агента и перейти к документам об отгрузке?",
  },
  mgr_report_reject: {
    label: "Вернуть отчёт на доработку клиенту",
    confirm: "Вернуть отчёт агента клиенту на доработку?",
  },
  mgr_shipment_waiting: {
    label: "Перейти к документам об отгрузке",
    confirm: "Перейти к этапу отгрузки и запросить документы у клиента?",
  },
  mgr_shipment_start: { label: "Взять отгрузку в проверку" },
  mgr_shipment_reject: {
    label: "Вернуть документы об отгрузке на доработку",
    confirm: "Вернуть документы об отгрузке клиенту на доработку?",
  },
  mgr_completed: {
    label: "Закрыть сделку",
    confirm: "Закрыть сделку и завершить сопровождение?",
  },
};

export const MANAGER_CLOSE_ACTION_PANEL = {
  reportRejectReason: "Что исправить в отчёте агента",
  reportRejectPlaceholder: "Укажите замечания по отчёту агента для клиента",
  shipmentRejectReason: "Что исправить в документах об отгрузке",
  shipmentRejectPlaceholder: "Укажите, какие документы об отгрузке клиенту нужно исправить или приложить",
};

export const MANAGER_CLOSE_FORM_DETAIL = {
  actionPanelTitle: "Сопровождение: отчёт и закрытие",
};

export const MANAGER_DASHBOARD = {
  actionRequired: "Требуют вашего действия",
  activeDeals: "Сделок в сопровождении",
  activeSum: "Сумма в сопровождении",
  closedDeals: "Сделок закрыто",
  tasksTitle: "Сделки, требующие действия",
  tasksLink: "Все сделки →",
  tasksEmpty: "Нет сделок, ожидающих вашего шага.",
  stagesTitle: "Сделки по этапам",
};

export const MANAGER_STAGE_LABELS: Partial<Record<StageId, string>> = {
  agency_contract: "Агентский договор",
  signing_order: "Поручение принципала",
  payment: "Платёж",
  agent_report: "Отчёт агента",
  shipment: "Отгрузка",
  completed: "Закрытые сделки",
};

export function managerCloseStatusLabel(status: FormStatus): RoleStatusLabel | undefined {
  return MANAGER_CLOSE_STATUS_LABELS[status];
}

export function applyManagerCloseActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return actions.map((action) => {
    const copy = MANAGER_CLOSE_ACTION_LABELS[action.id];
    if (!copy) return action;
    return {
      ...action,
      label: copy.label,
      confirm: copy.confirm ?? action.confirm,
    };
  });
}

export function isManagerClosePhaseStatus(status: FormStatus): boolean {
  return status in MANAGER_CLOSE_STATUS_LABELS;
}

export function managerCloseReasonFields(
  actionId: string,
): { label: string; placeholder: string } | undefined {
  if (actionId === "mgr_report_reject") {
    return {
      label: MANAGER_CLOSE_ACTION_PANEL.reportRejectReason,
      placeholder: MANAGER_CLOSE_ACTION_PANEL.reportRejectPlaceholder,
    };
  }
  if (actionId === "mgr_shipment_reject") {
    return {
      label: MANAGER_CLOSE_ACTION_PANEL.shipmentRejectReason,
      placeholder: MANAGER_CLOSE_ACTION_PANEL.shipmentRejectPlaceholder,
    };
  }
  return undefined;
}

export function managerStageLabel(stageId: StageId): string | undefined {
  return MANAGER_STAGE_LABELS[stageId];
}

export function applyManagerActionLabels(actions: FormAction[], status: FormStatus): FormAction[] {
  return applyManagerCloseActionLabels(
    applyManagerPaymentActionLabels(applyManagerContractActionLabels(actions, status), status),
    status,
  );
}
