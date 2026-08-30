import { describe, expect, it } from "vitest";

import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import { navLabelForRole } from "./nav-labels";
import { ROLE_FOCUS } from "./role-voice";
import {
  PROVIDER_ACTION_LABELS,
  PROVIDER_ACTION_PANEL,
  PROVIDER_DASHBOARD,
  PROVIDER_FORBIDDEN_COPY_TERMS,
  PROVIDER_FORM_DETAIL,
  PROVIDER_FORMS_LIST,
  PROVIDER_NAV,
  PROVIDER_STATUS_LABELS,
  applyProviderActionLabels,
  collectProviderCopyStrings,
  providerReasonFields,
} from "./provider-copy";

describe("Provider copy layer (RW7)", () => {
  it("maps payment statuses for provider", () => {
    expect(statusMeta("payment_received", "provider").label).toBe("Платёж передан в исполнение");
    expect(statusMeta("payment_processing", "provider").label).toBe("Платёж в работе");
    expect(statusMeta("payment_sent", "provider").label).toBe("Платёж отправлен");
  });

  it("does not override manager status labels", () => {
    expect(statusMeta("payment_received", "manager").label).toBe("ДС получены");
  });

  it("maps prov_payment_* actions from glossary", () => {
    const received = actionsFor("provider", "payment_received");
    expect(received.find((a) => a.id === "prov_payment_start")?.label).toBe("Начать исполнение платежа");
    expect(received.find((a) => a.id === "prov_payment_start")?.confirm).toContain("реквизит");

    const processing = actionsFor("provider", "payment_processing");
    expect(processing.find((a) => a.id === "prov_attach_proof")?.label).toBe(
      "Прикрепить подтверждение (платёжка/хеш)",
    );
    expect(processing.find((a) => a.id === "prov_payment_sent")?.label).toBe("Подтвердить отправку платежа");
    expect(processing.find((a) => a.id === "prov_payment_return")?.label).toBe("Вернуть на уточнение менеджеру");
    expect(processing.find((a) => a.id === "prov_payment_return")?.confirm).toContain("менеджер");
  });

  it("exposes form detail and list copy without client column wording", () => {
    expect(PROVIDER_FORM_DETAIL.requisitesTitle).toBe("Реквизиты для исполнения платежа");
    expect(PROVIDER_FORM_DETAIL.actionPanelTitle).toBe("Исполнение платежа");
    expect(PROVIDER_FORMS_LIST.title).toBe("Платежи в исполнении");
    expect(PROVIDER_FORMS_LIST.searchPlaceholder).not.toContain("клиент");
  });

  it("exposes dashboard and nav provider voice", () => {
    expect(ROLE_FOCUS.provider).toContain("без данных клиента");
    expect(PROVIDER_DASHBOARD.tasksTitle).toContain("Платежи");
    expect(navLabelForRole("/forms", "Реестр заявок", "provider")).toBe(PROVIDER_NAV["/forms"]);
    expect(navLabelForRole("/forms", "Реестр заявок", "root")).toBe("Реестр заявок");
  });

  it("exposes return reason fields without PII prompts", () => {
    const fields = providerReasonFields("prov_payment_return");
    expect(fields?.label).toBe(PROVIDER_ACTION_PANEL.returnReasonLabel);
    expect(fields?.placeholder).toContain("без персональных данных");
  });

  it("scan: provider copy strings contain no forbidden PII terms", () => {
    const haystack = collectProviderCopyStrings().join("\n");
    for (const term of PROVIDER_FORBIDDEN_COPY_TERMS) {
      expect(haystack).not.toContain(term);
    }
  });

  it("covers glossary samples", () => {
    expect(PROVIDER_STATUS_LABELS.payment_processing?.label).toBe("Платёж в работе");
    expect(PROVIDER_ACTION_LABELS.prov_payment_sent?.label).toBe("Подтвердить отправку платежа");
  });

  it("applyProviderActionLabels preserves unknown actions", () => {
    const input = [{ id: "unknown_action", label: "Original", tone: "quiet" as const }];
    expect(applyProviderActionLabels(input)[0]?.label).toBe("Original");
  });
});
