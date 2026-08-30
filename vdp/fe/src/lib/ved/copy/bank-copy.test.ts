import { describe, expect, it } from "vitest";

import { ROLE_FOCUS } from "./role-voice";
import {
  BANK_CHANNEL_BADGE,
  BANK_CORRELATION,
  BANK_ORGANIZATIONS,
  BANK_SETTINGS_PANEL,
  BANK_TESTING,
  collectBankCopyStrings,
  formatBankCorrelationId,
  formatBankCreateSuccess,
} from "./bank-copy";

describe("Bank channel copy (RW8)", () => {
  it("exposes channel badge labels", () => {
    expect(BANK_CHANNEL_BADGE.bankLabeled).toBe("Канал: Bank API");
    expect(BANK_CHANNEL_BADGE.bankShort).toBe("Bank API");
    expect(BANK_CHANNEL_BADGE.uiLabeled).toBe("Канал: UI");
  });

  it("formats correlation id with trace title", () => {
    expect(formatBankCorrelationId("corr-smoke-1")).toBe("Корр. ID: corr-smoke-1");
    expect(BANK_CORRELATION.title).toContain("Correlation ID");
    expect(BANK_CORRELATION.title).toContain("трассировка");
  });

  it("exposes settings panel copy with webhook and commission", () => {
    expect(BANK_SETTINGS_PANEL.commissionLabel).toContain("комиссия");
    expect(BANK_SETTINGS_PANEL.webhookUrlLabel).toContain("webhook");
    expect(BANK_SETTINGS_PANEL.webhookSecretLabel).toContain("подписи");
    expect(BANK_SETTINGS_PANEL.clientTypeBank).toContain("Bank API");
    expect(BANK_SETTINGS_PANEL.markupLabel).toContain("наценку");
  });

  it("exposes testing simulate strings without debug channel= tokens", () => {
    expect(BANK_TESTING.simulateButton).toBe("Создать заявку через Bank API");
    const success = formatBankCreateSuccess("f-1", "corr-1");
    expect(success).toContain("корр. ID corr-1");
    expect(success).not.toContain("channel=");
  });

  it("scenario steps reference badge and correlation", () => {
    expect(BANK_TESTING.scenarioSteps.join(" ")).toContain(BANK_CHANNEL_BADGE.bankLabeled);
    expect(BANK_TESTING.scenarioSteps.join(" ")).toContain("корреляцион");
  });

  it("organizations section uses Russian client badge", () => {
    expect(BANK_ORGANIZATIONS.clientBadge).toBe("Клиент Bank API");
    expect(BANK_ORGANIZATIONS.sectionTitle).toContain("Bank API");
  });

  it("does not touch root role focus", () => {
    expect(ROLE_FOCUS.root).toContain("Состояние системы");
  });

  it("collectBankCopyStrings covers main buckets", () => {
    const strings = collectBankCopyStrings();
    expect(strings.length).toBeGreaterThan(10);
    expect(strings.some((s) => s.includes(BANK_CHANNEL_BADGE.bankLabeled))).toBe(true);
  });
});
