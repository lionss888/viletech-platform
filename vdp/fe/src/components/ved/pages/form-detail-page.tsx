import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getComplianceHistory, getForm, startExtraction } from "@/lib/api/forms";
import { getFormDiadocStatus } from "@/lib/api/notifications";
import {
  mapComplianceHistory,
  mapCoreFormToPaymentForm,
  nextStepHint,
  rejectFromHistory,
} from "@/lib/api/mappers";
import { ExtractionReviewPanel } from "@/components/ved/ExtractionReviewPanel";
import { CorrectionGuidancePanel } from "@/components/ved/CorrectionGuidancePanel";
import { CounterpartyPickDialog } from "@/components/ved/CounterpartyPickDialog";
import { OrganizationPickDialog } from "@/components/ved/OrganizationPickDialog";
import { FormParamsEditDialog } from "@/components/ved/FormParamsEditDialog";
import { ActionPanel } from "@/components/ved/ActionPanel";
import { DocumentList } from "@/components/ved/DocumentViewer";
import { RefundPanel } from "@/components/ved/RefundPanel";
import { DirectionTag, StatusBadge } from "@/components/ved/StatusBadge";
import { ChannelBadge } from "@/components/ved/ChannelBadge";
import { StageStepper } from "@/components/ved/StageStepper";
import { SubjectReview } from "@/components/ved/SubjectReview";
import { VedAppShell } from "@/components/ved/VedAppShell";
import { VedLink } from "@/components/ved/VedLink";
import { assertFileSize, UploadError } from "@/lib/api/files";
import { useAuth } from "@/lib/auth/session";
import {
  isComplianceRole,
  orgBlocksApproval,
  orgPendingIco,
  subjectState,
  subjectsOf,
  subjectsPendingReview,
} from "@/lib/ved/compliance";
import { canControlExtraction } from "@/lib/ved/extraction";
import { canProviderDeleteDocuments, canUploadDocuments } from "@/lib/ved/doc-upload-policy";
import { dateTime, money } from "@/lib/ved/format";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { cpByIdFrom, orgByIdFrom, usePlatformStore } from "@/lib/ved/platform-store";
import {
  providerDetailFacts,
  providerPaymentRequisites,
  providerVisibleDocuments,
} from "@/lib/ved/provider-acl";
import { roleTitle } from "@/lib/ved/roles";
import { statusMetaForProcess } from "@/lib/ved/process-stage-filters";
import { useProcessRolesRows } from "@/lib/ved/use-process-roles-snapshot";
import type { AttachedDocument } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

export function FormDetail() {
  const { id } = useParams({ strict: false });
  const formId = id ?? "";
  const mode = usePlatformMode();
  const auth = useAuth();
  const { forms, session, organizations, counterparties, users, addDocuments, deleteDocument } =
    usePlatformStore();
  const processRoles = useProcessRolesRows();
  const [cpDialogOpen, setCpDialogOpen] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const diadocQuery = useQuery({
    queryKey: ["form-diadoc", formId],
    queryFn: () => getFormDiadocStatus(formId),
    enabled: mode === "app" && Boolean(formId),
  });

  const form = useMemo(() => {
    const fromStore = forms.find((f) => f.id === formId);
    const timeline = historyQuery.data
      ? mapComplianceHistory(historyQuery.data, users, processRoles)
      : [];
    const reject = historyQuery.data ? rejectFromHistory(historyQuery.data) : {};
    if (mode === "app" && formQuery.data) {
      const mapped = mapCoreFormToPaymentForm(formQuery.data, auth.displayName, timeline);
      const storeDocs = fromStore?.documents ?? [];
      const apiDocs = mapped.documents ?? [];
      const preferApi =
        apiDocs.some((d) => d.fileId) || storeDocs.every((d) => !d.fileId);
      return {
        ...mapped,
        documents: preferApi && apiDocs.length > 0 ? apiDocs : storeDocs.length > 0 ? storeDocs : apiDocs,
        ...reject,
      };
    }
    if (fromStore) {
      return { ...fromStore, ...(timeline.length > 0 ? { timeline } : {}), ...reject };
    }
    if (formQuery.data) {
      return { ...mapCoreFormToPaymentForm(formQuery.data, auth.displayName, timeline), ...reject };
    }
    return undefined;
  }, [forms, formId, formQuery.data, historyQuery.data, auth.displayName, users, mode, processRoles]);

  const role = session?.role ?? auth.role ?? "user";
  const canEditParams =
    (role === "user" || role === "manager" || role === "root") &&
    (form?.status === "draft" ||
      form?.status === "creating" ||
      String(form?.status ?? "").includes("corrections"));
  /** Org/CP: only user|root on draft|creating|*corrections* — never manager. */
  const canChangeParties =
    mode === "app" &&
    (role === "user" || role === "root") &&
    (form?.status === "draft" ||
      form?.status === "creating" ||
      String(form?.status ?? "").includes("corrections"));

  async function onUploadDocs(fileList: FileList | null) {
    if (!fileList?.length || !form) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      const files = Array.from(fileList);
      for (const file of files) assertFileSize(file);
      await addDocuments(form.id, files);
      if (canControlExtraction(role, form.status)) {
        try {
          await startExtraction(form.id);
          await formQuery.refetch();
        } catch {
          /* panel still offers manual start/restart */
        }
      }
    } catch (err) {
      setUploadError(
        err instanceof UploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось загрузить",
      );
    } finally {
      setUploadBusy(false);
    }
  }

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
            Вернуться в реестр
          </VedLink>
        </div>
      </VedAppShell>
    );
  }

  const org = orgByIdFrom(organizations, form.organizationId);
  const cp = cpByIdFrom(counterparties, form.counterpartyId);
  const meta = statusMetaForProcess(form.status, processRoles, role);
  const compliance = isComplianceRole(role);
  const subjects = subjectsOf(form, organizations, counterparties);
  const hasBlocked = orgBlocksApproval(subjects);
  const orgPending = orgPendingIco(subjects);
  const subjectsPending = subjectsPendingReview(subjects);
  const isProvider = role === "provider";
  const canUploadDocs = Boolean(mode === "app" && !isProvider && canUploadDocuments(form.status, role));
  const canDeleteDocs = Boolean(
    mode === "app" &&
      ((isProvider && canProviderDeleteDocuments(form.status)) ||
        (canUploadDocs && (role === "user" || role === "root"))),
  );
  const canReviewSubjects = compliance || role === "manager" || role === "root";
  const providerLabel =
    users.find((u) => u.id === form.providerId)?.name ?? form.providerName ?? "не назначен";
  const managerLabel =
    users.find((u) => u.id === form.managerId)?.name ?? form.managerName ?? "не назначен";
  const icoOrgStage =
    role === "internal_compliance_officer" && String(form.status).startsWith("organization");
  const actionLock = hasBlocked
    ? ({ lockNote: "Организация клиента заблокирована — согласование заявки недоступно." } as const)
    : subjectsPending && !icoOrgStage
      ? ({
          lockAcceptNote: "Участники сделки не проверены — одобрение заявки недоступно.",
        } as const)
      : orgPending && role === "internal_compliance_officer"
        ? ({
            note: "Организация ещё не одобрена — сначала проверьте участника, затем можно взять заявку в работу.",
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
        ...(form.counterpartyCurrency
          ? [["Валюта контрагента", form.counterpartyCurrency] as [string, string]]
          : []),
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
        <StatusBadge status={form.status} full processRoles={processRoles} viewerRole={role} />
        {form.channel === "bank" && <ChannelBadge channel="bank" labeled />}
        {form.channel === "ui" && <ChannelBadge channel="ui" labeled />}
        {form.correlationId && (
          <span className="font-mono text-[11px] text-muted-foreground" title="Correlation ID">
            corr: {form.correlationId}
          </span>
        )}
        <span className="ml-auto font-mono text-lg font-semibold">
          {money(form.amountMinor, form.currency)}
        </span>
      </div>

      {mode === "app" && diadocQuery.data && diadocQuery.data.status !== "idle" && (
        <div className="panel mt-4 p-4">
          <p className="label-caps">Электронный документооборот</p>
          <p className="mt-2 text-sm">
            {diadocQuery.data.status === "queued" && "Документ в очереди ЭДО — ожидайте подпись."}
            {diadocQuery.data.status === "signed" && "Документ подписан в ЭДО."}
            {diadocQuery.data.status === "failed" && "ЭДО не принял документ. Используйте ручной путь."}
          </p>
          {diadocQuery.data.manual_path && (
            <p className="mt-2 text-sm text-muted-foreground">
              Запасной путь: скачайте документ в блоке «Документы» и загрузите подписанный файл вручную.
              Пилот D1 (ручная подпись) сохранён.
            </p>
          )}
        </div>
      )}

      <div className="panel mt-4 p-4">
        <p className="label-caps">Жизненный цикл</p>
        <div className="mt-3">
          <StageStepper status={form.status} processRoles={processRoles} />
        </div>
      </div>

      {mode === "app" && !isProvider && (
        <div className="mt-4">
          <ExtractionReviewPanel
            formId={form.id}
            invoiceJson={form.invoiceJson ?? formQuery.data?.invoice_json}
            role={role}
            status={form.status}
            noDocuments={Boolean(form.noDocuments)}
            hasDocuments={visibleDocuments.length > 0}
            canConfirm={role === "user" || role === "manager" || role === "root"}
          />
        </div>
      )}

      {(form.rejectText || form.rejectMark) && (
        <div className="mt-4 rounded-lg bg-return-soft p-4" data-testid="return-banner">
          <p className="label-caps text-return">Возврат на доработку</p>
          {form.rejectMark && (
            <p className="mt-1 text-sm font-semibold text-return">Отметка: {form.rejectMark}</p>
          )}
          {form.rejectText && <p className="mt-1 text-sm text-return">{form.rejectText}</p>}
          {String(form.status).includes("correction") && (
            <CorrectionGuidancePanel
              formId={form.id}
              rejectMark={form.rejectMark}
              rejectText={form.rejectText}
              canEdit={role === "user"}
            />
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="panel p-4" data-testid="form-documents">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="label-caps flex items-center gap-2">
                <span>{isProvider ? "Документы сделки" : "Документы"}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  {visibleDocuments.length}
                </span>
              </p>
              {canUploadDocs && (
                <label className="flex h-9 cursor-pointer items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  {uploadBusy ? "Загрузка…" : "Загрузить документы"}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="sr-only"
                    disabled={uploadBusy}
                    data-testid="form-doc-upload"
                    onChange={(e) => {
                      void onUploadDocs(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {visibleDocuments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {isProvider
                  ? "Документы сделки (без агентского договора). Платёжку можно прикрепить через действие на карточке."
                  : canUploadDocs
                    ? String(form.status).includes("correction")
                      ? "Документы не загружены. Загрузите файлы здесь, затем нажмите «Отправить исправления» справа."
                      : "Документы пока не загружены — добавьте PDF кнопкой выше."
                    : "Документы пока не загружены."}
              </p>
            ) : (
              <DocumentList
                documents={visibleDocuments}
                formId={formId}
                canDelete={canDeleteDocs}
                onDelete={
                  canDeleteDocs
                    ? async (doc) => {
                        const fileId = doc.fileId || doc.id;
                        if (!fileId) return;
                        await deleteDocument(form.id, fileId);
                        await formQuery.refetch();
                      }
                    : undefined
                }
              />
            )}
            {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
          </div>

          <div className="panel p-4" id="form-params" data-testid="form-params">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-caps">Параметры заявки</p>
              {canEditParams && (
                <button
                  type="button"
                  data-testid="edit-form-params"
                  className="text-sm font-semibold text-accent hover:underline"
                  onClick={() => setEditOpen(true)}
                >
                  Редактировать
                </button>
              )}
            </div>
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
              <div className="panel p-4" data-testid="organization-block">
                <p className="label-caps">Организация клиента</p>
                <p className="mt-2 text-sm font-semibold">{org?.name ?? form.organizationId}</p>
                <p className="font-mono text-xs text-muted-foreground">ИНН {org?.inn ?? "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{org?.legalAddress ?? "—"}</p>
                {canChangeParties && (
                  <button
                    type="button"
                    data-testid="change-organization"
                    className="mt-2 text-sm font-semibold text-accent hover:underline"
                    onClick={() => setOrgDialogOpen(true)}
                  >
                    Сменить организацию
                  </button>
                )}
              </div>
              <div className="panel p-4" data-testid="counterparty-block">
                <p className="label-caps">Контрагент</p>
                {cp && form.counterpartyId && form.counterpartyId !== "—" ? (
                  <>
                    <p className="mt-2 text-sm font-semibold">{cp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cp.country ?? "—"} · {cp.bank ?? "—"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">SWIFT {cp.swift ?? "—"}</p>
                    {canChangeParties && (
                      <button
                        type="button"
                        data-testid="change-counterparty"
                        className="mt-2 text-sm font-semibold text-accent hover:underline"
                        onClick={() => setCpDialogOpen(true)}
                      >
                        Сменить контрагента
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">Контрагент не выбран</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Укажите контрагента здесь — иначе реквизиты получателя пустые. Справочник откроется
                      в окне, без ухода с заявки.
                    </p>
                    {canChangeParties && (
                      <button
                        type="button"
                        data-testid="open-counterparty-picker"
                        className="mt-2 text-sm font-semibold text-accent hover:underline"
                        onClick={() => setCpDialogOpen(true)}
                      >
                        Выбрать контрагента
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {!isProvider && mode === "app" && (
            <>
              <CounterpartyPickDialog
                open={cpDialogOpen}
                onOpenChange={setCpDialogOpen}
                formId={formId}
                role={role}
                counterparties={counterparties}
                selectedId={form.counterpartyId}
              />
              <OrganizationPickDialog
                open={orgDialogOpen}
                onOpenChange={setOrgDialogOpen}
                formId={formId}
                role={role}
                organizations={organizations}
                selectedId={form.organizationId}
              />
            </>
          )}

          <div className="panel p-4">
            <p className="label-caps">Хронология</p>
            <p className="mt-1 text-xs text-muted-foreground">
              История шагов по заявке: кто что сделал и к какому статусу пришли. Новые события сверху.
            </p>
            <ol className="mt-3 space-y-3">
              {form.timeline.length === 0 && (
                <li className="text-sm text-muted-foreground">События появятся после действий по заявке.</li>
              )}
              {form.timeline.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      entry.done ? "bg-done" : "bg-border",
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm",
                        entry.done ? "font-medium" : "text-muted-foreground",
                      )}
                    >
                      {entry.title}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {dateTime(entry.at)} ·{" "}
                      {entry.actorName
                        ? `${entry.actorName} · ${roleTitle(entry.actorRole)}`
                        : roleTitle(entry.actorRole)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <p className="label-caps">Следующий шаг</p>
            <p className="mt-2 text-sm">{nextStepHint(form.status, role, processRoles)}</p>
          </div>

          {compliance ? (
            <>
              <ActionPanel
                form={form}
                title="Рассмотрение заявки"
                onEditForm={canEditParams ? () => setEditOpen(true) : undefined}
                {...actionLock}
              />
              <SubjectReview subjects={subjects} />
            </>
          ) : (
            <>
              <ActionPanel
                form={form}
                onEditForm={canEditParams ? () => setEditOpen(true) : undefined}
              />
              {!isProvider && <RefundPanel form={form} />}
            </>
          )}

          {!compliance && !isProvider && canReviewSubjects && <SubjectReview subjects={subjects} />}
          {!compliance &&
            !isProvider &&
            !canReviewSubjects &&
            subjects.some((s) => !subjectState(s.status).ok) && (
              <SubjectReview subjects={subjects} readOnly />
            )}

          {role !== "provider" && (
            <div className="panel p-4">
              <p className="label-caps">Участники</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Клиент: {form.ownerName}</li>
                <li>Назначенный менеджер: {managerLabel}</li>
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

        </div>
      </div>

      {canEditParams && (
        <FormParamsEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          formId={form.id}
          role={role}
          amountMinor={form.amountMinor}
          currency={form.currency}
          hsCode={form.hsCode}
          direction={form.direction}
          kind={form.kind}
          contractNumber={form.invoiceNumber}
          contractDate={form.shipmentDate}
          onChangeOrg={() => {
            setEditOpen(false);
            setOrgDialogOpen(true);
          }}
          onChangeCounterparty={() => {
            setEditOpen(false);
            setCpDialogOpen(true);
          }}
        />
      )}
    </VedAppShell>
  );
}
