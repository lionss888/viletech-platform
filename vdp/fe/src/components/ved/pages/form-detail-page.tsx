import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getComplianceHistory, getForm, startExtraction } from "@/lib/api/forms";
import { listExecutionProviders } from "@/lib/api/catalog";
import { getFormDiadocStatus } from "@/lib/api/notifications";
import {
  assignedManagerLabel,
  assignedProviderLabel,
  mapComplianceHistory,
  mapCoreFormToPaymentForm,
  nextStepHint,
  rejectFromHistory,
  resolveClientName,
  showReturnBanner,
} from "@/lib/api/mappers";
import { ExtractionReviewDialog } from "@/components/ved/ExtractionReviewDialog";
import { PogStatusPanel } from "@/components/ved/pog-status-panel";
import { CorrectionGuidancePanel } from "@/components/ved/CorrectionGuidancePanel";
import { CounterpartyPickDialog } from "@/components/ved/CounterpartyPickDialog";
import { OrganizationPickDialog } from "@/components/ved/OrganizationPickDialog";
import { FormParamsEditDialog } from "@/components/ved/FormParamsEditDialog";
import { ActionPanel } from "@/components/ved/ActionPanel";
import { DocumentList } from "@/components/ved/DocumentViewer";
import { RateCommissionPanel } from "@/components/ved/RateCommissionPanel";
import { RefundPanel } from "@/components/ved/RefundPanel";
import { ShipmentPanel } from "@/components/ved/ShipmentPanel";
import { ProviderReturnReportPanel } from "@/components/ved/ProviderReturnReportPanel";
import { ManagerReturnFactPanel } from "@/components/ved/ManagerReturnFactPanel";
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
import {
  canControlExtraction,
  extractionAmountWarnings,
  extractionPanelMode,
  extractionTriggerLabel,
  orderExtractionWarnings,
  parseExtractionResult,
} from "@/lib/ved/extraction";
import { canProviderDeleteDocuments, canUploadDocuments } from "@/lib/ved/doc-upload-policy";
import { dateTime, money } from "@/lib/ved/format";
import { isPostpayRateOnPP } from "@/lib/ved/manager-payment";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { cpByIdFrom, orgByIdFrom, usePlatformStore } from "@/lib/ved/platform-store";
import {
  providerDetailFacts,
  providerPaymentRequisites,
  providerVisibleDocuments,
} from "@/lib/ved/provider-acl";
import {
  counterpartyGapLine,
  counterpartyPlaceLine,
  counterpartySwiftLine,
  innLine,
  organizationAddressLine,
  presentValue,
} from "@/lib/ved/party-requisites";
import {
  isOrderWaitingTake,
  isWaitingTakeStatus,
  orderReviewChecklist,
  reviewChecklist,
} from "@/lib/ved/review-checklist";
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
  const executionQuery = useQuery({
    queryKey: ["execution-providers"],
    queryFn: listExecutionProviders,
    enabled: mode === "app" && (auth.role === "manager" || auth.role === "root"),
  });
  const { forms, session, organizations, counterparties, users, currencies, hsCodes, addDocuments, deleteDocument } =
    usePlatformStore();
  const processRoles = useProcessRolesRows();
  const [cpDialogOpen, setCpDialogOpen] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [extractionDialogOpen, setExtractionDialogOpen] = useState(false);
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
  
  const returnEpisodeQuery = useQuery({
    queryKey: ["return-episode", formId],
    queryFn: async () => {
      const { getReturnEpisode } = await import("@/lib/api/return");
      return getReturnEpisode(formId);
    },
    enabled: mode === "app" && Boolean(formId),
    retry: false,
  });

  const form = useMemo(() => {
    const fromStore = forms.find((f) => f.id === formId);
    const timeline = historyQuery.data
      ? mapComplianceHistory(historyQuery.data, users, processRoles)
      : [];
    const reject = historyQuery.data ? rejectFromHistory(historyQuery.data) : {};
    if (mode === "app" && formQuery.data) {
      const mapped = mapCoreFormToPaymentForm(formQuery.data, undefined, timeline);
      const storeDocs = fromStore?.documents ?? [];
      const apiDocs = mapped.documents ?? [];
      const preferApi =
        apiDocs.some((d) => d.fileId) || storeDocs.every((d) => !d.fileId);
      return {
        ...mapped,
        ownerName: resolveClientName(formQuery.data.account_id, users, {
          role: auth.role ?? undefined,
          name: auth.displayName,
        }),
        documents: preferApi && apiDocs.length > 0 ? apiDocs : storeDocs.length > 0 ? storeDocs : apiDocs,
        ...reject,
      };
    }
    if (fromStore) {
      return { ...fromStore, ...(timeline.length > 0 ? { timeline } : {}), ...reject };
    }
    if (formQuery.data) {
      return { ...mapCoreFormToPaymentForm(formQuery.data, undefined, timeline), ...reject };
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
  const providerAccounts = [
    ...users,
    ...(executionQuery.data ?? []).map((row) => ({ id: row.id, name: row.name, role: "provider" as const })),
  ];
  const providerLabel = assignedProviderLabel(form.providerId, providerAccounts, form.providerName);
  const managerLabel = assignedManagerLabel(form.managerId, users, form.managerName);
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
        ["Код ТН ВЭД", presentValue(form.hsCode) ?? "не указан"],
        ["Инвойс", presentValue(form.invoiceNumber) ?? "не указан"],
        ...(form.contractNumber ? [["Договор", form.contractNumber] as [string, string]] : []),
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
  const reviewWork = form.status === "form_verification" || form.status === "organization_verification";
  const waitingTake = isWaitingTakeStatus(form.status) || isOrderWaitingTake(form.status);
  const canLeadReview = role === "manager" || role === "root" || compliance;
  const focusFacts: [string, string][] = [
    ["Сумма", money(form.amountMinor, form.currency)],
    ["Направление", form.direction === "import" ? "Импорт" : "Экспорт"],
    ["Контрагент", cp?.name ?? "не указан"],
    ["Условие оплаты", form.condition === "advance" ? "Аванс" : "Постоплата"],
  ];
  const parsedExtraction = parseExtractionResult(form.invoiceJson);
  const amountWarnings = parsedExtraction
    ? isOrderWaitingTake(form.status)
      ? orderExtractionWarnings(parsedExtraction, form.amountMinor, form.currency)
      : extractionAmountWarnings(parsedExtraction)
    : [];
  const checks = isOrderWaitingTake(form.status)
    ? orderReviewChecklist({
        documents: form.documents,
        hsCode: form.hsCode,
        amountWarnings,
      })
    : reviewChecklist({
        documents: form.documents,
        hsCode: form.hsCode,
        counterpartyName: cp?.name,
        counterpartyStatus: cp?.status,
        amountWarnings,
      });
  const orderStageHighlight = form.status.includes("signing_order") ? "order" : undefined;
  const invoiceJson = form.invoiceJson ?? formQuery.data?.invoice_json;
  const extractionMode =
    mode === "app" && !isProvider
      ? extractionPanelMode({
          role,
          hasDraft: Boolean(parseExtractionResult(invoiceJson)),
          status: form.status,
          noDocuments: Boolean(form.noDocuments),
          hasDocuments: visibleDocuments.length > 0,
        })
      : "hide";
  const extractionTrigger = extractionTriggerLabel(extractionMode);
  const showRateCommission =
    form.status === "payment_sent" &&
    isPostpayRateOnPP({
      platformPostpayMode: form.platformPostpayMode,
      rateOnProvider: form.rateOnProvider,
    }) &&
    (role === "manager" || role === "root");
  const canEditRateCommission = showRateCommission;

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

      {(showReturnBanner(form.status, form.rejectText, form.rejectMark)) && (
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
              <div className="flex flex-wrap items-center gap-2">
                {extractionMode !== "hide" && extractionTrigger ? (
                  <button
                    type="button"
                    data-testid="extraction-dialog-trigger"
                    className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
                    onClick={() => setExtractionDialogOpen(true)}
                  >
                    {extractionTrigger}
                  </button>
                ) : null}
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
                highlightKind={orderStageHighlight}
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
                <p className="font-mono text-xs text-muted-foreground">{innLine(org?.inn)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{organizationAddressLine(org?.legalAddress)}</p>
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
                    {counterpartyPlaceLine(cp.country, cp.bank) ? (
                      <p className="text-xs text-muted-foreground">{counterpartyPlaceLine(cp.country, cp.bank)}</p>
                    ) : null}
                    {counterpartySwiftLine(cp.swift) ? (
                      <p className="font-mono text-xs text-muted-foreground">{counterpartySwiftLine(cp.swift)}</p>
                    ) : null}
                    {counterpartyGapLine(cp.bank, cp.swift) ? (
                      <p className="text-xs text-muted-foreground">{counterpartyGapLine(cp.bank, cp.swift)}</p>
                    ) : null}
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
          {waitingTake && canLeadReview ? (
            <div className="panel p-4" data-testid="review-checklist">
              <p className="label-caps">Следующий шаг</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {checks.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : reviewWork && canLeadReview ? (
            <ActionPanel
              form={form}
              title="Следующий шаг"
              surface="focus"
              focusFacts={focusFacts}
              {...(compliance ? actionLock : {})}
            />
          ) : (
            <div className="panel p-4">
              <p className="label-caps">Следующий шаг</p>
              <p className="mt-2 text-sm">
                {nextStepHint(form.status, role, processRoles, {
                  condition: form.condition,
                  direction: form.direction,
                  paymentMethod: form.paymentMethod,
                  contractId: form.contractId,
                  providerId: form.providerId,
                })}
              </p>
            </div>
          )}

          {compliance ? (
            <>
              <ActionPanel
                form={form}
                title="Рассмотрение заявки"
                surface={reviewWork && canLeadReview ? "rest" : "all"}
                onEditForm={canEditParams ? () => setEditOpen(true) : undefined}
                {...actionLock}
              />
              <SubjectReview subjects={subjects} />
            </>
          ) : (
            <>
              <ActionPanel
                form={form}
                surface={reviewWork && canLeadReview ? "rest" : "all"}
                onEditForm={canEditParams ? () => setEditOpen(true) : undefined}
              />
              {showRateCommission && (
                <RateCommissionPanel
                  formId={form.id}
                  canEdit={canEditRateCommission}
                  rate={form.rate}
                  commission={form.commission}
                  invoiceAmount={
                    form.amountMinor ? String(form.amountMinor / 100) : undefined
                  }
                  currency={form.currency}
                />
              )}
              {(role === "manager" || role === "root") && form.status.includes("signing_order") ? (
                <PogStatusPanel form={form} />
              ) : null}
              {!isProvider && <RefundPanel form={form} />}
              {!isProvider && <ShipmentPanel form={form} />}
              
              {/* Return Episode - Stage 1: Provider reports return */}
              {isProvider && (
                <ProviderReturnReportPanel
                  formId={form.id}
                  currency={form.currency}
                  returnEpisode={returnEpisodeQuery.data}
                  onSuccess={() => {
                    formQuery.refetch();
                    returnEpisodeQuery.refetch();
                  }}
                />
              )}
              
              {/* Return Episode - Manager sees fact */}
              {!isProvider && returnEpisodeQuery.data?.active && (
                <ManagerReturnFactPanel
                  returnEpisode={returnEpisodeQuery.data}
                  currency={form.currency}
                />
              )}
            </>
          )}

          {!compliance &&
            !isProvider &&
            !form.status.startsWith("payment") &&
            canReviewSubjects && <SubjectReview subjects={subjects} />}
          {!compliance &&
            !isProvider &&
            !form.status.startsWith("payment") &&
            !canReviewSubjects &&
            subjects.some((s) => !subjectState(s.status).ok) && (
              <SubjectReview subjects={subjects} readOnly />
            )}

          {role !== "provider" && (
            <div className="panel p-4">
              <p className="label-caps">Участники</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Клиент: {presentValue(form.ownerName) ?? "не указан"}</li>
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
          contractNumber={form.contractNumber ?? ""}
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

      {extractionMode !== "hide" && (
        <ExtractionReviewDialog
          open={extractionDialogOpen}
          onOpenChange={setExtractionDialogOpen}
          formId={form.id}
          invoiceJson={invoiceJson}
          role={role}
          status={form.status}
          noDocuments={Boolean(form.noDocuments)}
          hasDocuments={visibleDocuments.length > 0}
          canConfirm={role === "user" || role === "manager" || role === "root"}
          currencyOptions={currencies.map((item) => ({ value: item.code, label: `${item.code} — ${item.title}` }))}
          hsOptions={hsCodes.map((item) => ({ value: item.code, label: `${item.code} — ${item.title}` }))}
          formAmountMinor={form.amountMinor}
          formCurrency={form.currency}
          documentKind={visibleDocuments.some((d) => d.kind === "order") ? "order" : undefined}
        />
      )}
    </VedAppShell>
  );
}
