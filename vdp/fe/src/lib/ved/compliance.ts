/** Логика представления для ролей комплаенс: проверка заявки и проверка участников. */

import type { ComplianceToolRecord } from "./reference";
import type { Counterparty, Organization, PaymentForm, VedRole } from "./types";

export const COMPLIANCE_ROLES: VedRole[] = ["internal_compliance_officer", "compliance_officer"];

export function isComplianceRole(role: VedRole | undefined): boolean {
  return !!role && COMPLIANCE_ROLES.includes(role);
}

export type ReviewScope = "form" | "organization";

/** Отметки справочника, доступные в выбранном контуре проверки. */
export function marksFor(tools: ComplianceToolRecord[], scope: ReviewScope): ComplianceToolRecord[] {
  return tools.filter((t) => t.active !== false && (t.scope === scope || t.scope === "both"));
}

export type ReviewSubject = {
  key: "organizations" | "counterparties";
  id: string;
  kind: "Организация клиента" | "Контрагент";
  name: string;
  detail: string;
  status: string;
  note?: string | undefined;
  mark?: string | undefined;
};

const SUBJECT_STATE: Record<string, { text: string; cls: string; ok: boolean }> = {
  approved: { text: "Проверен", cls: "bg-done-soft text-done", ok: true },
  waiting_verification: { text: "Запрошены сведения", cls: "bg-wait-soft text-wait", ok: false },
  not_approved: { text: "Не проверен", cls: "bg-return-soft text-return", ok: false },
  blocked: { text: "Заблокирован", cls: "bg-destructive-soft text-destructive", ok: false },
};

export function subjectState(status: string) {
  return SUBJECT_STATE[status] ?? SUBJECT_STATE["not_approved"]!;
}

/** Участники заявки, подлежащие проверке комплаенс. */
export function subjectsOf(
  form: PaymentForm,
  organizations: Organization[],
  counterparties: Counterparty[],
): ReviewSubject[] {
  const org = organizations.find((o) => o.id === form.organizationId);
  const cp = counterparties.find((c) => c.id === form.counterpartyId);
  const list: ReviewSubject[] = [];
  if (org) {
    const raw = org as unknown as Record<string, string | undefined>;
    list.push({
      key: "organizations",
      id: org.id,
      kind: "Организация клиента",
      name: org.name,
      detail: `ИНН ${org.inn}`,
      status: org.status,
      note: raw["complianceNote"],
      mark: raw["complianceMark"],
    });
  }
  if (cp) {
    const raw = cp as unknown as Record<string, string | undefined>;
    list.push({
      key: "counterparties",
      id: cp.id,
      kind: "Контрагент",
      name: cp.name,
      detail: `${cp.country} · SWIFT ${cp.swift}`,
      status: cp.status,
      note: raw["complianceNote"],
      mark: raw["complianceMark"],
    });
  }
  return list;
}

/** Проверка участников завершена — можно рассматривать саму заявку. */
export function subjectsCleared(subjects: ReviewSubject[]): boolean {
  return subjects.length > 0 && subjects.every((s) => subjectState(s.status).ok);
}
