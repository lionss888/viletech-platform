import { describe, expect, it } from "vitest";

import {
  mapComplianceHistory,
  mapCoreFormToPaymentForm,
  nextStepHint,
  normalizeFormId,
  parseDocsJson,
  waitingActorLabel,
} from "./mappers";
import type { CoreForm } from "./forms";

describe("normalizeFormId", () => {
  it("formats 32-char hex as dashed uuid", () => {
    expect(normalizeFormId("ca3dcfcddd3de79d19109c885e5f397b")).toBe(
      "ca3dcfcd-dd3d-e79d-1910-9c885e5f397b",
    );
  });

  it("keeps already dashed uuid", () => {
    expect(normalizeFormId("ca3dcfcd-dd3d-e79d-1910-9c885e5f397b")).toBe(
      "ca3dcfcd-dd3d-e79d-1910-9c885e5f397b",
    );
  });
});

describe("mapCoreFormToPaymentForm", () => {
  it("normalizes create-style hex id", () => {
    const form = {
      id: "ca3dcfcddd3de79d19109c885e5f397b",
      account_id: "a1",
      organization_id: "o1",
      status: "draft",
      direction: "import",
      kind: "good",
      invoice_amount: "10",
      currency: "USD",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as CoreForm;
    const mapped = mapCoreFormToPaymentForm(form, "User");
    expect(mapped.id).toBe("ca3dcfcd-dd3d-e79d-1910-9c885e5f397b");
  });
});

describe("parseDocsJson", () => {
  it("parses array docs_json", () => {
    const raw = JSON.stringify([{ id: "f1", kind: "invoice", label: "INV.pdf", mime: "application/pdf" }]);
    const docs = parseDocsJson(raw, "form-1");
    expect(docs).toHaveLength(1);
    expect(docs[0]?.title).toBe("INV.pdf");
    expect(docs[0]?.kind).toBe("invoice");
  });

  it("returns empty for invalid json", () => {
    expect(parseDocsJson("{bad", "x")).toEqual([]);
  });
});

describe("mapComplianceHistory", () => {
  it("maps history entries to timeline with human-readable labels", () => {
    const timeline = mapComplianceHistory([
      {
        id: "h1",
        form_payment_id: "f1",
        actor_id: "a1",
        from_status: "draft",
        to_status: "organization_waiting_verification",
        comment: "submit",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(timeline[0]?.title).toContain("Черновик");
    expect(timeline[0]?.title).toContain("Ожидает проверки организации");
    expect(timeline[0]?.title).toContain("submit");
    expect(timeline[0]?.title).not.toMatch(/organization_waiting_verification/);
  });

  it("maps creating → draft without snake_case codes", () => {
    const timeline = mapComplianceHistory([
      {
        id: "h2",
        form_payment_id: "f1",
        actor_id: "a1",
        from_status: "creating",
        to_status: "draft",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(timeline[0]?.title).toContain("Создаётся");
    expect(timeline[0]?.title).toContain("Черновик");
    expect(timeline[0]?.title).not.toContain("creating");
  });

  it("resolves actor name and role from actor_id when users provided", () => {
    const timeline = mapComplianceHistory(
      [
        {
          id: "h3",
          form_payment_id: "f1",
          actor_id: "mgr-1",
          from_status: "organization_waiting_verification",
          to_status: "organization_verification",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      [
        {
          id: "mgr-1",
          name: "Анна Менеджер",
          email: "manager@vdp.local",
          role: "manager",
          blocked: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    );
    expect(timeline[0]?.actorName).toBe("Анна Менеджер");
    expect(timeline[0]?.actorRole).toBe("manager");
  });
});

describe("mapCoreFormToPaymentForm manager", () => {
  it("keeps manager_id as managerId, not display name", () => {
    const form = {
      id: "ca3dcfcd-dd3d-e79d-1910-9c885e5f397b",
      account_id: "a1",
      organization_id: "o1",
      manager_id: "mgr-uuid",
      status: "draft",
      direction: "import",
      kind: "good",
      invoice_amount: "10",
      currency: "USD",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as CoreForm;
    const mapped = mapCoreFormToPaymentForm(form, "User");
    expect(mapped.managerId).toBe("mgr-uuid");
    expect(mapped.managerName).toBeUndefined();
  });
});

describe("nextStepHint", () => {
  it("tells manager who owns organization_waiting_verification without snapshot", () => {
    const hint = nextStepHint("organization_waiting_verification", "manager");
    expect(hint.toLowerCase()).toMatch(/комплаенс|внутренн/);
    expect(hint).toMatch(/действий нет|Сейчас действует/i);
  });

  it("gives ICO their primary action on organization_waiting_verification", () => {
    const hint = nextStepHint("organization_waiting_verification", "internal_compliance_officer");
    expect(hint).toContain("Взять в проверку");
  });
});

describe("waitingActorLabel", () => {
  it("names internal compliance for organization_waiting_verification without snapshot", () => {
    const label = waitingActorLabel("organization_waiting_verification");
    expect(label).toBeTruthy();
    expect(label!.toLowerCase()).toMatch(/комплаенс|вко|внутренн/);
  });
});
