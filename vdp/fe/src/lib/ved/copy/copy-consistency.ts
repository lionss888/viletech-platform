import type { FormStatus, VedRole } from "../types";
import { actionsFor } from "../actions";
import { statusMeta } from "../statuses";
import { collectBankCopyStrings } from "./bank-copy";
import { collectProviderCopyStrings, PROVIDER_FORBIDDEN_COPY_TERMS } from "./provider-copy";
import { ROLE_FOCUS, USER_FORMS_LIST, ECO_FORMS_LIST, ECO_FORM_DETAIL } from "./role-voice";
import { PROVIDER_FORMS_LIST } from "./provider-copy";
import { MANAGER_CLOSE_ACTION_LABELS } from "./manager-close-copy";

/** Primary entity term per role (RW9: one term per role, glossary §Правила). */
export const ROLE_ENTITY_PRIMARY: Record<
  Exclude<VedRole, "root" | "bank">,
  { term: "заявка" | "сделка" | "платеж"; registryHint: string }
> = {
  user: { term: "заявка", registryHint: USER_FORMS_LIST.title },
  internal_compliance_officer: { term: "заявка", registryHint: "Входящие" },
  compliance_officer: { term: "сделка", registryHint: ECO_FORMS_LIST.title },
  manager: { term: "сделка", registryHint: MANAGER_CLOSE_ACTION_LABELS.mgr_completed?.label ?? "сделк" },
  provider: { term: "платеж", registryHint: PROVIDER_FORMS_LIST.title },
};

export type CopyJourneyStep = {
  phase: string;
  role: VedRole;
  status: FormStatus;
  actionId?: string;
  expectedStatusLabel?: string;
  expectedActionLabel?: string;
};

/** User → completed: labels each role sees at handoff points (RW9 cross-cabinet check). */
export const COPY_JOURNEY: CopyJourneyStep[] = [
  { phase: "RD1", role: "user", status: "draft", actionId: "accept_form", expectedStatusLabel: "Черновик заявки", expectedActionLabel: "Отправить заявку на проверку" },
  {
    phase: "RD2",
    role: "internal_compliance_officer",
    status: "organization_waiting_verification",
    actionId: "ico_form_start",
    expectedStatusLabel: "В очереди на верификацию организации",
    expectedActionLabel: "Взять организацию/заявку в проверку",
  },
  {
    phase: "RD2",
    role: "internal_compliance_officer",
    status: "organization_verification",
    actionId: "ico_form_accept",
    expectedStatusLabel: "На верификации организации",
    expectedActionLabel: "Одобрить и передать дальше",
  },
  {
    phase: "RD3",
    role: "compliance_officer",
    status: "form_waiting_verification",
    actionId: "eco_form_start",
    expectedStatusLabel: "В очереди на проверку сделки",
    expectedActionLabel: "Взять сделку в проверку",
  },
  {
    phase: "RD3",
    role: "compliance_officer",
    status: "form_verification",
    actionId: "eco_form_accept",
    expectedStatusLabel: "На проверке сделки",
    expectedActionLabel: "Подтвердить условия сделки",
  },
  {
    phase: "RD3-handoff",
    role: "user",
    status: "form_accepted",
    expectedStatusLabel: "Заявка принята",
  },
  {
    phase: "RD3-handoff",
    role: "compliance_officer",
    status: "form_accepted",
    expectedStatusLabel: "Сделка подтверждена",
  },
  {
    phase: "RD3-handoff",
    role: "manager",
    status: "form_accepted",
    actionId: "mgr_assign_agent",
    expectedStatusLabel: "Готова к сопровождению",
    expectedActionLabel: "Назначить агента по сделке",
  },
  {
    phase: "RD5",
    role: "manager",
    status: "payment_received",
    actionId: "mgr_payment_start",
    expectedStatusLabel: "ДС получены",
    expectedActionLabel: "Передать в исполнение",
  },
  {
    phase: "RD7",
    role: "provider",
    status: "payment_received",
    actionId: "prov_payment_start",
    expectedStatusLabel: "Платёж передан в исполнение",
    expectedActionLabel: "Начать исполнение платежа",
  },
  {
    phase: "RD7",
    role: "provider",
    status: "payment_processing",
    actionId: "prov_payment_sent",
    expectedStatusLabel: "Платёж в работе",
    expectedActionLabel: "Подтвердить отправку платежа",
  },
  {
    phase: "RD7-handoff",
    role: "user",
    status: "payment_sent",
    expectedStatusLabel: "Платёж отправлен",
  },
  {
    phase: "RD7-handoff",
    role: "manager",
    status: "payment_sent",
    expectedStatusLabel: "Платёж отправлен",
  },
  {
    phase: "RD7-handoff",
    role: "provider",
    status: "payment_sent",
    expectedStatusLabel: "Платёж отправлен",
  },
  {
    phase: "RD6",
    role: "user",
    status: "report_waiting",
    actionId: "upload_report",
    expectedStatusLabel: "Подпишите отчёт агента",
    expectedActionLabel: "Загрузить подписанный отчёт агента",
  },
  {
    phase: "RD6-close",
    role: "user",
    status: "completed",
    expectedStatusLabel: "Сделка закрыта",
  },
  {
    phase: "RD6-close",
    role: "manager",
    status: "completed",
    expectedStatusLabel: "Сделка закрыта",
  },
];

export type CopyConsistencyIssue = { rule: string; detail: string };

export function collectJourneyLabelMismatches(): CopyConsistencyIssue[] {
  const issues: CopyConsistencyIssue[] = [];
  for (const step of COPY_JOURNEY) {
    if (step.expectedStatusLabel) {
      const actual = statusMeta(step.status, step.role).label;
      if (actual !== step.expectedStatusLabel) {
        issues.push({
          rule: "journey-status",
          detail: `${step.phase} ${step.role}@${step.status}: expected «${step.expectedStatusLabel}», got «${actual}»`,
        });
      }
    }
    if (step.actionId && step.expectedActionLabel) {
      const action = actionsFor(step.role, step.status).find((a) => a.id === step.actionId);
      if (!action) {
        issues.push({
          rule: "journey-action-missing",
          detail: `${step.phase} ${step.role}@${step.status}: action ${step.actionId} not in matrix`,
        });
      } else if (action.label !== step.expectedActionLabel) {
        issues.push({
          rule: "journey-action",
          detail: `${step.phase} ${step.role}@${step.status}.${step.actionId}: expected «${step.expectedActionLabel}», got «${action.label}»`,
        });
      }
    }
  }
  return issues;
}

/** P0: payment_sent must read as «отправлен» for all roles that see this status. */
export function collectPaymentSentAlignmentIssues(): CopyConsistencyIssue[] {
  const roles: VedRole[] = ["user", "manager", "provider"];
  const issues: CopyConsistencyIssue[] = [];
  for (const role of roles) {
    const label = statusMeta("payment_sent", role).label.toLowerCase();
    if (!label.includes("отправлен")) {
      issues.push({
        rule: "payment-sent-align",
        detail: `${role} payment_sent: «${statusMeta("payment_sent", role).label}» missing «отправлен»`,
      });
    }
  }
  return issues;
}

/** P0: provider-facing copy must not contain PII terms. */
export function collectProviderPiiIssues(): CopyConsistencyIssue[] {
  const haystack = collectProviderCopyStrings().join("\n");
  const issues: CopyConsistencyIssue[] = [];
  for (const term of PROVIDER_FORBIDDEN_COPY_TERMS) {
    if (haystack.includes(term)) {
      issues.push({ rule: "provider-pii", detail: `Provider copy contains forbidden term: ${term}` });
    }
  }
  return issues;
}

/** Per-role primary entity term in registry/list copy. */
export function collectEntityPrimaryIssues(): CopyConsistencyIssue[] {
  const issues: CopyConsistencyIssue[] = [];
  const userTitle = USER_FORMS_LIST.title.toLowerCase();
  if (!userTitle.includes("заявк")) {
    issues.push({ rule: "entity-primary", detail: `User registry should use «заявка», got: ${USER_FORMS_LIST.title}` });
  }
  const ecoSubtitle = ECO_FORMS_LIST.subtitle(1).toLowerCase();
  if (!ecoSubtitle.includes("сделк") && !ECO_FORM_DETAIL.actionPanelTitle.toLowerCase().includes("сделк")) {
    issues.push({
      rule: "entity-primary",
      detail: `ECO copy should use «сделка» in queue/subtitle, got subtitle: ${ECO_FORMS_LIST.subtitle(1)}`,
    });
  }
  const providerTitle = PROVIDER_FORMS_LIST.title.toLowerCase();
  if (!providerTitle.includes("платеж")) {
    issues.push({ rule: "entity-primary", detail: `Provider registry should use «платеж», got: ${PROVIDER_FORMS_LIST.title}` });
  }
  const mgrClose = MANAGER_CLOSE_ACTION_LABELS.mgr_completed?.label ?? "";
  if (!mgrClose.toLowerCase().includes("сделк")) {
    issues.push({ rule: "entity-primary", detail: `Manager close CTA should use «сделка», got: ${mgrClose}` });
  }
  return issues;
}

export function collectAllCopyConsistencyIssues(): CopyConsistencyIssue[] {
  return [
    ...collectJourneyLabelMismatches(),
    ...collectPaymentSentAlignmentIssues(),
    ...collectProviderPiiIssues(),
    ...collectEntityPrimaryIssues(),
  ];
}

/** Root copy is out of RW scope — snapshot for regression gate. */
export const ROOT_COPY_SNAPSHOT = {
  roleFocus: ROLE_FOCUS.root,
} as const;

/** Bank channel copy must not alter root/admin voice. */
export function collectBankRootBleedIssues(): CopyConsistencyIssue[] {
  const issues: CopyConsistencyIssue[] = [];
  if (ROLE_FOCUS.root !== ROOT_COPY_SNAPSHOT.roleFocus) {
    issues.push({ rule: "root-unchanged", detail: "ROLE_FOCUS.root was modified outside root scope" });
  }
  const forbiddenInBank = ["суперадмин", "/admin", "RootDashboard"];
  for (const line of collectBankCopyStrings()) {
    for (const term of forbiddenInBank) {
      if (line.includes(term)) {
        issues.push({ rule: "bank-root-separation", detail: `Bank copy references admin/root UI: «${term}» in «${line.slice(0, 60)}…»` });
      }
    }
  }
  return issues;
}
