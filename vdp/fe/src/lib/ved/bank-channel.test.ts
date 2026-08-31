import { describe, expect, it } from "vitest";

import { mapCoreOrganization } from "@/lib/api/catalog-mappers";
import { mapCoreFormToPaymentForm } from "@/lib/api/mappers";
import type { CoreForm } from "@/lib/api/forms";
import type { CoreOrganization } from "@/lib/api/catalog";
import { BANK_ORG_ID, isBankChannel } from "@/lib/ved/bank-channel";

describe("bank channel constants", () => {
  it("seed bank org id matches baseline", () => {
    expect(BANK_ORG_ID).toBe("88888888-8888-8888-8888-888888888888");
  });

  it("isBankChannel detects bank", () => {
    expect(isBankChannel("bank")).toBe(true);
    expect(isBankChannel("ui")).toBe(false);
  });
});

describe("mapCoreFormToPaymentForm bank fields", () => {
  it("maps channel and correlation_id", () => {
    const form = {
      id: "f-bank-1",
      account_id: "bank",
      organization_id: BANK_ORG_ID,
      status: "draft",
      direction: "import",
      kind: "good",
      invoice_amount: "100",
      currency: "USD",
      channel: "bank",
      correlation_id: "corr-smoke-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as CoreForm;
    const mapped = mapCoreFormToPaymentForm(form, "Bank");
    expect(mapped.channel).toBe("bank");
    expect(mapped.correlationId).toBe("corr-smoke-1");
  });
});

describe("mapCoreOrganization bank settings", () => {
  it("maps client_type and commission", () => {
    const org: CoreOrganization = {
      id: BANK_ORG_ID,
      name: "Bank Client Org",
      client_type: "bank",
      bank_fixed_commission_percent: "1.5",
      apply_platform_markup: false,
    };
    const mapped = mapCoreOrganization(org);
    expect(mapped.clientType).toBe("bank");
    expect(mapped.bankFixedCommissionPercent).toBe("1.5");
    expect(mapped.applyPlatformMarkup).toBe(false);
  });
});
