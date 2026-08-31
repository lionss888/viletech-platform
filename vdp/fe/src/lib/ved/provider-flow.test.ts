import { describe, expect, it } from "vitest";

import { actionsFor, PROVIDER_HIDDEN_FIELDS } from "./actions";
import { resolveDemoAction } from "./action-bridge";
import {
  isProviderHiddenField,
  providerCsvHeader,
  providerDetailFacts,
  providerFormSearchHaystack,
  providerPaymentRequisites,
  providerVisibleDocuments,
} from "./provider-acl";
import type { Counterparty, Organization, PaymentForm } from "./types";

function stubForm(partial: Partial<PaymentForm> = {}): PaymentForm {
  return {
    id: "f1",
    number: "VDP-77",
    status: partial.status ?? "payment_processing",
    direction: "import",
    kind: "good",
    condition: "advance",
    amountMinor: 50000,
    currency: "USD",
    organizationId: "org-1",
    counterpartyId: "cp-1",
    hsCode: "1234",
    invoiceNumber: "INV-77",
    ownerName: "Ivan Petrov",
    managerName: "Manager One",
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-02T10:00:00Z",
    documents: [
      {
        id: "d1",
        title: "Contract",
        ext: "PDF",
        size: "1 MB",
        uploadedAt: "2026-08-01T10:00:00Z",
        kind: "contract",
      },
      {
        id: "d2",
        title: "Payment proof",
        ext: "PDF",
        size: "200 KB",
        uploadedAt: "2026-08-02T10:00:00Z",
        kind: "payment",
      },
    ],
    timeline: [],
    ...partial,
  };
}

const org: Organization = {
  id: "org-1",
  name: "Acme LLC",
  inn: "7700000000",
  legalAddress: "Moscow, Secret St 1",
  status: "approved",
  createdAt: "2026-01-01",
};

const cp: Counterparty = {
  id: "cp-1",
  name: "Foreign Co",
  country: "Germany",
  countryCode: "DE",
  bank: "Deutsche Bank",
  swift: "DEUTDEFF",
  scope: "foreign",
  status: "approved",
};

describe("provider ACL helpers", () => {
  it("search haystack excludes ownerName", () => {
    const form = stubForm({ ownerName: "Secret Client" });
    const hay = providerFormSearchHaystack(form, org.name, cp.name);
    expect(hay).not.toContain("Secret Client");
    expect(hay).toContain("VDP-77");
    expect(hay).toContain("Acme LLC");
  });

  it("CSV header has no client column", () => {
    expect(providerCsvHeader()).not.toContain("Клиент");
  });

  it("detail facts omit hsCode and client-specific fields", () => {
    const facts = providerDetailFacts(stubForm());
    const keys = facts.map(([k]) => k);
    expect(keys).not.toContain("Код ТН ВЭД");
    expect(keys).not.toContain("Валюта клиента");
    expect(keys).toContain("Сумма");
  });

  it("payment requisites include bank fields but not legal address", () => {
    const rows = providerPaymentRequisites(stubForm(), org, cp);
    const joined = rows.map(([, v]) => v).join(" ");
    expect(joined).toContain("Acme LLC");
    expect(joined).toContain("DEUTDEFF");
    expect(joined).not.toContain("Secret St");
  });

  it("visible documents are payment kind only", () => {
    const docs = providerVisibleDocuments(stubForm());
    expect(docs).toHaveLength(1);
    expect(docs[0]?.kind).toBe("payment");
  });

  it("PROVIDER_HIDDEN_FIELDS covers client PII keys", () => {
    expect(PROVIDER_HIDDEN_FIELDS).toContain("ownerName");
    expect(isProviderHiddenField("ownerName")).toBe(true);
    expect(isProviderHiddenField("invoiceNumber")).toBe(false);
  });
});

describe("provider payment actions", () => {
  it("payment_received exposes start", () => {
    const ids = actionsFor("provider", "payment_received").map((a) => a.id);
    expect(ids).toEqual(["prov_payment_start"]);
  });

  it("payment_processing exposes attach proof, sent, return", () => {
    const ids = actionsFor("provider", "payment_processing").map((a) => a.id);
    expect(ids).toContain("prov_attach_proof");
    expect(ids).toContain("prov_payment_sent");
    expect(ids).toContain("prov_payment_return");
  });

  it("attach proof is set_confirmation side effect, not immediate sent", () => {
    expect(resolveDemoAction("prov_attach_proof")).toEqual({ kind: "set_confirmation" });
    expect(resolveDemoAction("prov_payment_sent")).toEqual({ kind: "transition", coreAction: "provider_sent" });
    expect(resolveDemoAction("prov_payment_start")).toEqual({ kind: "transition", coreAction: "provider_start" });
    expect(resolveDemoAction("prov_payment_return")).toEqual({ kind: "transition", coreAction: "provider_return" });
  });

  it("return targets manager_checking", () => {
    const action = actionsFor("provider", "payment_processing").find((a) => a.id === "prov_payment_return");
    expect(action?.nextStatus).toBe("manager_checking");
    expect(action?.requiresReason).toBe(true);
  });
});
