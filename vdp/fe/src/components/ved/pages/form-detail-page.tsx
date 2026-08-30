import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getComplianceHistory, getForm } from "@/lib/api/forms";
import { mapComplianceHistory, mapCoreFormToPaymentForm, rejectFromHistory } from "@/lib/api/mappers";
import { ActionPanel } from "@/components/ved/ActionPanel";
import { DocumentList } from "@/components/ved/DocumentViewer";
import { RefundPanel } from "@/components/ved/RefundPanel";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { ChannelBadge } from "@/components/ved/ChannelBadge";
import { StageStepper } from "@/components/ved/StageStepper";
import { SubjectReview } from "@/components/ved/SubjectReview";
import { VedAppShell } from "@/components/ved/VedAppShell";
import { VedLink } from "@/components/ved/VedLink";
import { useAuth } from "@/lib/auth/session";
import {
  isComplianceRole,
  orgBlocksApproval,
  orgPendingIco,
  subjectState,
  subjectsCleared,
  subjectsOf,
} from "@/lib/ved/compliance";
import { dateTime, money } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { cpByIdFrom, orgByIdFrom, usePlatformStore } from "@/lib/ved/platform-store";
import {
  providerDetailFacts,
  providerPaymentRequisites,
  providerVisibleDocuments,
} from "@/lib/ved/provider-acl";
import { roleTitle } from "@/lib/ved/roles";
import { ECO_FORM_DETAIL, ICO_FORM_DETAIL, USER_CORRECTIONS_BANNER, USER_FORMS_LIST } from "@/lib/ved/copy";
import { statusMeta } from "@/lib/ved/statuses";
import { cn } from "@/lib/utils";

export function FormDetail() {
  const { id } = useParams({ strict: false });
  const formId = id ?? "";
  const mode = usePlatformMode();
  const auth = useAuth();
  const { forms, session, organizations, counterparties, users } = usePlatformStore();
  const formQuery = useQuery({
    queryKey: ["form", formId],
    queryFn: () => getForm(formId),
    enabled: mode === "app" && Boolean(formId),
  });
  const historyQuery = useQuery({
    queryKey: ["form-history", formId],
    queryFn: () => getComplianceHistory(formId),
    enabled: mode === "app" && Boolean(formId),
  });

  const form = useMemo(() => {
    const fromStore = forms.find((f) => f.id === formId);
    const timeline = historyQuery.data ? mapComplianceHistory(historyQuery.data) : [];
    const reject = historyQuery.data ? rejectFromHistory(historyQuery.data) : {};
    if (fromStore) {
      return { ...fromStore, ...(timeline.length > 0 ? { timeline } : {}), ...reject };
    }
    if (formQuery.data) {
      return { ...mapCoreFormToPaymentForm(formQuery.data, auth.displayName, timeline), ...reject };
    }
    return undefined;
  }, [forms, formId, formQuery.data, historyQuery.data, auth.displayName]);

  const role = session?.role ?? auth.role ?? "user";

  if (!formId || (mode === "app" && formQuery.isLoading && !form)) {
    return (
      <VedAppShell title="Заявка">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </VedAppShell>
    );
  }

  if (!form) {
    return (
      <VedAppShell title="Заявка не найдена">
        <div className="panel p-6 text-sm text-muted-foreground">
          Заявка не найдена или недоступна вашей роли.{" "}
          <VedLink segment="/forms" className="font-semibold text-accent hover:underline">
            {role === "user"
              ? USER_FORMS_LIST.backToRegistry
              : role === "internal_compliance_officer"
                ? ICO_FORM_DETAIL.backToQueue
                : role === "compliance_officer"
                  ? ECO_FORM_DETAIL.backToQueue
                  : "Вернуться в реестр"}
          </VedLink>
        </div>
      </VedAppShell>
    );
  }

  const org = orgByIdFrom(organizations, form.organizationId);
  const cp = cpByIdFrom(counterparties, form.counterpartyId);
  const meta = statusMeta(form.status, role);
  const compliance = isComplianceRole(role);
  const subjects = subjectsOf(form, organizations, counterparties);
  const cleared = subjectsCleared(subjects);
  const hasBlocked = orgBlocksApproval(subjects);
  const orgPending = orgPendingIco(subjects);
  const subjectsPending = !cleared && !hasBlocked;
  const isProvider = role === "provider";
  const providerLabel =
    users.find((u) => u.id === form.providerId)?.name ?? form.providerName ?? "не назначен";
  const icoOrgStage =
    role === "internal_compliance_officer" && String(form.status).startsWith("organization");
  const isEco = role === "compliance_officer";
  const actionLock = hasBlocked
    ? ({
        lockNote: isEco
          ? ECO_FORM_DETAIL.lockNote
          : role === "internal_compliance_officer"
            ? ICO_FORM_DETAIL.lockNote
            : "Организация клиента заблокирована — согласование заявки недоступно.",
      } as const)
    : subjectsPending && !icoOrgStage
      ? ({
          lockAcceptNote: isEco
            ? ECO_FORM_DETAIL.lockAcceptNote
            : role === "internal_compliance_officer"
              ? ICO_FORM_DETAIL.lockAcceptNote
              : "Участники сделки не проверены — одобрение заявки недоступно.",
        } as const)
      : orgPending && role === "internal_compliance_officer"
        ? ({
            note: ICO_FORM_DETAIL.orgPendingNote,
          } as const)
        : {};

  const facts: [string, string][] = isProvider
    ? providerDetailFacts(form)
    : [
        ["Направление", form.direction === "import" ? "Импорт" : "Экспорт"],
        ["Предмет", form.kind === "good" ? "Товар" : "Услуга"],
        ["Условие оплаты", form.condition === "advance" ? "Аванс" : "Постоплата"],
        ["Код ТН ВЭД", form.hsCode],
        ["Инвойс", form.invoiceNumber],
        ["Сумма", money(form.amountMinor, form.currency)],
        ...(form.clientCurrency ? [["Валюта клиента", form.clientCurrency] as [string, string]] : []),
        ...(form.counterpartyCurrency ? [["Валюта контрагента", form.counterpartyCurrency] as [string, string]] : []),
        ...(form.shipmentDate ? [["Дата отгрузки", form.shipmentDate] as [string, string]] : []),
        ["Создана", dateTime(form.createdAt)],
        ["Обновлена", dateTime(form.updatedAt)],
      ];
  const paymentRequisites = isProvider ? providerPaymentRequisites(form, org, cp) : [];
  const visibleDocuments = isProvider ? providerVisibleDocuments(form) : form.documents;

  return (
    <VedAppShell title={form.number} subtitle={`${meta.label} · роль: ${roleTitle(role)}`}>
      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <DirectionTag direction={form.direction} />
        <StatusBadge status={form.status} full />
        {form.channel === "bank" && <ChannelBadge channel="bank" labeled />}
        {form.channel === "ui" && <ChannelBadge channel="ui" labeled />}
        {form.correlationId && (
          <span className="font-mono text-[11px] text-muted-foreground" title="Correlation ID">
            corr: {form.correlationId}
          </span>
        )}
        <span className="ml-auto font-mono text-lg font-semibold">{money(form.amountMinor, form.currency)}</span>
      </div>

      <div className="panel mt-4 p-4">
        <p className="label-caps">Жизненный цикл</p>
        <div className="mt-3">
          <StageStepper status={form.status} />
        </div>
      </div>

      {(form.rejectText || form.rejectMark) && (
        <div className="mt-4 rounded-lg bg-return-soft p-4">
          <p className="label-caps text-return">
            {role === "user"
              ? USER_CORRECTIONS_BANNER.title
              : role === "compliance_officer" && form.status === "form_waiting_corrections"
                ? ECO_FORM_DETAIL.correctionsPending
                : "Возврат на доработку"}
          </p>
          {form.rejectMark && (
            <p className="mt-1 text-sm font-semibold text-return">
              {role === "user" ? USER_CORRECTIONS_BANNER.markPrefix : "Отметка:"} {form.rejectMark}
            </p>
          )}
          {form.rejectText && <p className="mt-1 text-sm text-return">{form.rejectText}</p>}
          {role === "user" && (
            <p className="mt-2 text-xs text-muted-foreground">{USER_CORRECTIONS_BANNER.nextStep}</p>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="panel p-4">
            <p className="label-caps">Параметры заявки</p>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="label-caps">{k}</dt>
                  <dd className="font-mono text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {!isProvider && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel p-4">
                <p className="label-caps">Организация клиента</p>
                <p className="mt-2 text-sm font-semibold">{org?.name ?? form.organizationId}</p>
                <p className="font-mono text-xs text-muted-foreground">ИНН {org?.inn ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{org?.legalAddress ?? "—"}</p>
              </div>
              <div className="panel p-4">
                <p className="label-caps">Контрагент</p>
                <p className="mt-2 text-sm font-semibold">{cp?.name ?? form.counterpartyId}</p>
                <p className="text-xs text-muted-foreground">
                  {cp?.country ?? "—"} · {cp?.bank ?? "—"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">SWIFT {cp?.swift ?? "—"}</p>
              </div>
            </div>
          )}

          <div className="panel p-4">
            <p className="label-caps">
              {isProvider ? "Документы платежа" : "Документы"} ({visibleDocuments.length})
            </p>
            {visibleDocuments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {isProvider ? "Подтверждение платежа можно прикрепить через действие на карточке." : "Документы пока не загружены."}
              </p>
            ) : (
              <DocumentList documents={visibleDocuments} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          {compliance ? (
            <>
              <ActionPanel
                form={form}
                title={isEco ? ECO_FORM_DETAIL.actionPanelTitle : "Рассмотрение заявки"}
                {...actionLock}
              />
              <SubjectReview subjects={subjects} role={role} />
            </>
          ) : (
            <>
              <ActionPanel form={form} />
              {!isProvider && <RefundPanel form={form} />}
            </>
          )}

          {!compliance && !isProvider && subjects.some((s) => !subjectState(s.status).ok) && (
            <SubjectReview subjects={subjects} readOnly role={role} />
          )}

          {role !== "provider" && (
            <div className="panel p-4">
              <p className="label-caps">Участники</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Клиент: {form.ownerName}</li>
                <li>Менеджер: {form.managerName ?? "не назначен"}</li>
                <li>Провайдер: {providerLabel}</li>
              </ul>
            </div>
          )}

          {isProvider && (
            <div className="panel p-4">
              <p className="label-caps">Реквизиты платежа (без ПДн клиента)</p>
              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {paymentRequisites.map(([k, v]) => (
                  <div key={k}>
                    <dt className="label-caps">{k}</dt>
                    <dd className="font-mono text-sm">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="panel p-4">
            <p className="label-caps">Хронология</p>
            <ol className="mt-3 space-y-3">
              {form.timeline.length === 0 && (
                <li className="text-sm text-muted-foreground">События появятся после действий по заявке.</li>
              )}
              {form.timeline.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", entry.done ? "bg-done" : "bg-border")} />
                  <span className="min-w-0">
                    <span className={cn("block text-sm", entry.done ? "font-medium" : "text-muted-foreground")}>{entry.title}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {dateTime(entry.at)} · {roleTitle(entry.actorRole)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </VedAppShell>
  );
}
