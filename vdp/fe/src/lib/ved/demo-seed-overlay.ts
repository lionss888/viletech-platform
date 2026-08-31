import { FORMS, USERS } from "./mock";
import { STAGES, statusMeta } from "./statuses";
import type { AttachedDocument, PaymentForm, PlatformUser, TimelineEntry, VedRole } from "./types";

const DEMO_EMAIL_REMAP: Record<string, string> = {
  "manager2@bdui.local": "manager2@demo.vdp.local",
  "provider2@bdui.local": "provider2@demo.vdp.local",
};

const EXTRA_FORM_NUMBER = "ВЭД-2026-0120a";

const DOC_TEMPLATES: Record<AttachedDocument["kind"], { title: string; ext: AttachedDocument["ext"] }> = {
  invoice: { title: "Инвойс поставщика", ext: "PDF" },
  contract: { title: "Агентский договор", ext: "PDF" },
  order: { title: "Поручение принципала", ext: "PDF" },
  payment: { title: "Платёжное поручение", ext: "PDF" },
  report: { title: "Отчёт агента", ext: "PDF" },
  shipment: { title: "Транспортная накладная", ext: "JPG" },
  other: { title: "Дополнительный документ", ext: "XLSX" },
};

/**
 * Demo-only seed patches kept out of Lovable `mock.ts` so the file stays
 * byte-identical to `lovable-vdp/dev0` (see `make lovable-seed-check`).
 */
export function applyDemoSeedOverlay(users: PlatformUser[], forms: PaymentForm[]): {
  users: PlatformUser[];
  forms: PaymentForm[];
} {
  const remappedUsers = users.map((user) => {
    const nextEmail = DEMO_EMAIL_REMAP[user.email];
    return nextEmail ? { ...user, email: nextEmail } : user;
  });
  if (forms.some((form) => form.number === EXTRA_FORM_NUMBER)) {
    return { users: remappedUsers, forms };
  }
  return {
    users: remappedUsers,
    forms: [...forms, buildExtraForm(forms.length)],
  };
}

/** Seed users/forms for the demo store initial state. */
export function demoSeedUsers(): PlatformUser[] {
  return applyDemoSeedOverlay(USERS, FORMS).users;
}

/** Seed forms for the demo store initial state. */
export function demoSeedForms(): PaymentForm[] {
  return applyDemoSeedOverlay(USERS, FORMS).forms;
}

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 26, 8, 0, 0);

function iso(daysAgo: number, hourShift = 0): string {
  return new Date(NOW - daysAgo * DAY + hourShift * 3_600_000).toISOString();
}

function buildExtraForm(index: number): PaymentForm {
  const days = 23;
  const status = "report_accepted";
  const docs: AttachedDocument["kind"][] = ["invoice", "contract", "order", "payment", "report"];
  const id = `form-${index + 1}`;
  return {
    id,
    number: EXTRA_FORM_NUMBER,
    status,
    direction: "import",
    kind: "good",
    condition: "advance",
    amountMinor: 8_400_000 * 100,
    currency: "USD",
    organizationId: "org-1",
    counterpartyId: "cp-1",
    hsCode: "8471 30 00",
    invoiceNumber: `INV-${2026}-${(4100 + index).toString()}`,
    ownerName: "Д. Морозов",
    managerName: "П. Иванов",
    providerName: "S. Chen",
    createdAt: iso(days),
    updatedAt: iso(Math.max(0, days - 1), 3),
    documents: docs.map((kind, k) => ({
      id: `${id}-doc-${k}`,
      ...DOC_TEMPLATES[kind],
      kind,
      size: "412 КБ",
      uploadedAt: iso(days - k * 0.5),
    })),
    timeline: buildTimeline(status, days, EXTRA_FORM_NUMBER),
  };
}

/** Exported for unit tests. */
export const DEMO_OVERLAY_EXTRA_FORM_NUMBER = EXTRA_FORM_NUMBER;

function buildTimeline(status: string, days: number, number: string): TimelineEntry[] {
  const current = STAGES.findIndex((stage) => stage.id === statusMeta(status).stage);
  const actorByStage: Partial<Record<string, VedRole>> = {
    new: "user",
    organization_verification: "internal_compliance_officer",
    form_verification: "compliance_officer",
    agency_contract: "manager",
    signing_order: "user",
    payment: "provider",
    agent_report: "manager",
    shipment: "manager",
    completed: "manager",
  };
  return STAGES.map((stage, i) => ({
    id: `${number}-tl-${stage.id}`,
    title: stage.label,
    at: iso(days - i * 0.4),
    actorRole: actorByStage[stage.id] ?? "manager",
    done: i < current || (i === current && statusMeta(status).tone === "done"),
  }));
}
