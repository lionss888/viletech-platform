import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CounterpartyPickDialog } from "@/components/ved/CounterpartyPickDialog";
import { ExtractionReviewDialog } from "@/components/ved/ExtractionReviewDialog";
import { FilePickButton } from "@/components/ved/file-pick-button";
import { OcrProgress } from "@/components/ved/ocr-progress";
import { OrganizationPickDialog } from "@/components/ved/OrganizationPickDialog";
import { VedAppShell } from "@/components/ved/VedAppShell";
import { ensureHsCodeFromOcr } from "@/lib/api/catalog-mutations";
import {
  attachFormHsCodes,
  getForm,
  nestFormPrefixForRole,
  patchForm,
  transitionForm,
} from "@/lib/api/forms";
import { assertFileSize, UploadError } from "@/lib/api/files";
import { fetchOcrReadiness } from "@/lib/api/ocr-readiness";
import { CREATE_REVIEW_OCR_BANNER, CREATE_REVIEW_OCR_CAPTION } from "@/lib/ved/create-review-copy";
import {
  extractionPanelMode,
  extractionTriggerLabel,
  isExtractionDraft,
  isOcrAuthLostError,
  OCR_POLL_TIMEOUT_MS,
  ocrBannerFromExtraction,
  ocrPollTimedOut,
  parseExtractionResult,
  type OcrBannerState,
} from "@/lib/ved/extraction";
import { usePlatformBasePath, usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { sortCurrencyRecords } from "@/lib/ved/sort-currencies";
import type { FormCondition, FormDirection, FormKind } from "@/lib/ved/types";
import {
  conditionToPaymentMethod,
  deriveInvoiceCurrency,
  documentsLabel,
  mergeExtractionPrefill,
  NO_DOCUMENTS_DRAFT_ALERT,
  WIZARD_STEP,
  WIZARD_STEP_CAPTIONS,
  WIZARD_STEPS,
  validateDocsStep,
  type WizardTouched,
} from "@/lib/ved/wizard-steps";
import { cn } from "@/lib/utils";

type FinalizeMode = "draft" | "submit";

export function NewForm() {
  const { organizations, counterparties, currencies, hsCodes, createForm, session } = usePlatformStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const base = usePlatformBasePath();
  const mode = usePlatformMode();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [cpDialogOpen, setCpDialogOpen] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [ocrBannerState, setOcrBannerState] = useState<OcrBannerState | null>(null);
  const [ocrProgressVisible, setOcrProgressVisible] = useState(false);
  const [ocrInvoiceJson, setOcrInvoiceJson] = useState<string | undefined>(undefined);
  const [extractionDialogOpen, setExtractionDialogOpen] = useState(false);
  const [ocrManualOverride, setOcrManualOverride] = useState(false);
  const [skipOcrPromptOpen, setSkipOcrPromptOpen] = useState(false);
  const touchedRef = useRef<WizardTouched>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);
  const [draft, setDraft] = useState({
    direction: "import" as FormDirection,
    kind: "good" as FormKind,
    condition: "advance" as FormCondition,
    organizationId: "",
    counterpartyId: "",
    amount: "",
    clientCurrency: "RUB",
    counterpartyCurrency: "CNY",
    hsCode: "",
    invoiceNumber: "",
    contractNumber: "",
    contractDate: "",
    shipmentDate: "",
    noDocuments: false,
    invoiceFile: null as File | null,
    contractFile: null as File | null,
  });
  const currencyOptions = useMemo(() => sortCurrencyRecords(currencies), [currencies]);
  const hasClientOrg = organizations.length > 0;
  const derivedCurrency = deriveInvoiceCurrency(draft.clientCurrency, draft.counterpartyCurrency);

  useEffect(() => {
    setDraft((prev) => {
      const nextOrg =
        prev.organizationId && organizations.some((o) => o.id === prev.organizationId)
          ? prev.organizationId
          : (organizations[0]?.id ?? "");
      const nextCp =
        prev.counterpartyId && counterparties.some((c) => c.id === prev.counterpartyId)
          ? prev.counterpartyId
          : (counterparties[0]?.id ?? "");
      const nextHs =
        prev.hsCode && hsCodes.some((h) => h.code === prev.hsCode) ? prev.hsCode : prev.hsCode;
      const prefer = (code: string, fallback: string) =>
        currencyOptions.some((c) => c.code === code) ? code : (currencyOptions[0]?.code ?? fallback);
      const nextClientCurrency = prefer(prev.clientCurrency, "RUB");
      const nextCounterpartyCurrency = prefer(prev.counterpartyCurrency, "CNY");
      if (
        nextOrg === prev.organizationId &&
        nextCp === prev.counterpartyId &&
        nextHs === prev.hsCode &&
        nextClientCurrency === prev.clientCurrency &&
        nextCounterpartyCurrency === prev.counterpartyCurrency
      ) {
        return prev;
      }
      return {
        ...prev,
        organizationId: nextOrg,
        counterpartyId: nextCp,
        hsCode: nextHs,
        clientCurrency: nextClientCurrency,
        counterpartyCurrency: nextCounterpartyCurrency,
      };
    });
  }, [organizations, counterparties, hsCodes, currencyOptions]);

  const applyOcrPrefill = useCallback((invoiceJson: string | undefined | null): "done" | "degraded" | false => {
    const extraction = parseExtractionResult(invoiceJson);
    if (!extraction) return false;
    setOcrInvoiceJson(invoiceJson ?? undefined);
    setDraft((prev) => {
      const merged = mergeExtractionPrefill(
        {
          amount: prev.amount,
          counterpartyCurrency: prev.counterpartyCurrency,
          invoiceNumber: prev.invoiceNumber,
          contractNumber: prev.contractNumber,
          hsCode: prev.hsCode,
        },
        touchedRef.current,
        extraction,
      );
      return {
        ...prev,
        amount: merged.amount ?? prev.amount,
        counterpartyCurrency: merged.counterpartyCurrency ?? prev.counterpartyCurrency,
        invoiceNumber: merged.invoiceNumber ?? prev.invoiceNumber,
        contractNumber: merged.contractNumber ?? prev.contractNumber,
        hsCode: merged.hsCode ?? prev.hsCode,
      };
    });
    return ocrBannerFromExtraction(extraction);
  }, []);

  useEffect(() => {
    if (!formId || mode !== "app" || draft.noDocuments) return;
    let cancelled = false;
    const stopPoll = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const startPoll = () => {
      setOcrBannerState("pending");
      setOcrProgressVisible(true);
      pollStartedAtRef.current = Date.now();
      const tick = async () => {
        try {
          if (ocrPollTimedOut(Date.now() - pollStartedAtRef.current, OCR_POLL_TIMEOUT_MS)) {
            stopPoll();
            try {
              const lateForm = await getForm(formId);
              if (cancelled) return;
              if (isExtractionDraft(lateForm.invoice_json)) {
                const outcome = applyOcrPrefill(lateForm.invoice_json);
                if (outcome) {
                  setOcrBannerState(outcome);
                  return;
                }
              }
            } catch (lateErr) {
              if (isOcrAuthLostError(lateErr)) {
                setOcrBannerState("auth_lost");
                setOcrProgressVisible(true);
                navigate({ to: `${base}/login` as never });
                return;
              }
            }
            if (!cancelled) setOcrBannerState("failed");
            return;
          }
          const form = await getForm(formId);
          if (isExtractionDraft(form.invoice_json)) {
            const outcome = applyOcrPrefill(form.invoice_json);
            if (outcome) {
              stopPoll();
              setOcrBannerState(outcome);
            }
          }
        } catch (err) {
          if (isOcrAuthLostError(err)) {
            stopPoll();
            setOcrBannerState("auth_lost");
            setOcrProgressVisible(true);
            navigate({ to: `${base}/login` as never });
          }
        }
      };
      void tick();
      pollRef.current = setInterval(() => void tick(), 1500);
    };
    void (async () => {
      try {
        const readiness = await fetchOcrReadiness();
        if (cancelled) return;
        if (!readiness.ok) {
          setOcrBannerState("unavailable");
          setOcrProgressVisible(true);
          return;
        }
        startPoll();
      } catch (err) {
        if (cancelled) return;
        if (isOcrAuthLostError(err)) {
          setOcrBannerState("auth_lost");
          setOcrProgressVisible(true);
          navigate({ to: `${base}/login` as never });
          return;
        }
        startPoll();
      }
    })();
    return () => {
      cancelled = true;
      stopPoll();
    };
  }, [formId, mode, draft.noDocuments, applyOcrPrefill, navigate, base]);

  const extractionMode = extractionPanelMode({
    role: session?.role ?? "user",
    hasDraft: Boolean(parseExtractionResult(ocrInvoiceJson)),
    status: "creating",
    noDocuments: draft.noDocuments,
    hasDocuments: !draft.noDocuments && Boolean(formId),
  });
  const extractionTrigger = extractionTriggerLabel(extractionMode);
  function setField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setInvalidFields((prev) => (prev.includes(key as string) ? prev.filter((k) => k !== key) : prev));
  }

  function enableNoDocumentsPath() {
    setDraft((prev) => ({ ...prev, noDocuments: true, invoiceFile: null, contractFile: null }));
    setInvalidFields([]);
    setError(null);
    setStep(WIZARD_STEP.terms);
  }

  function disableNoDocumentsPath() {
    setField("noDocuments", false);
    setStep(WIZARD_STEP.docs);
  }

  function setTouchedField(key: keyof WizardTouched, value: string) {
    touchedRef.current = { ...touchedRef.current, [key]: true };
    setField(key as keyof typeof draft, value as never);
  }

  function onFilePick(key: "invoiceFile" | "contractFile", file: File | null) {
    if (!file) {
      setField(key, null);
      return;
    }
    try {
      assertFileSize(file);
      setField(key, file);
      setError(null);
    } catch (e) {
      setField(key, null);
      setError(e instanceof UploadError ? e.message : "Недопустимый файл");
    }
  }

  function validateStep(): { message: string; fields: string[] } | null {
    const fields: string[] = [];
    const messages: string[] = [];
    if (step === WIZARD_STEP.docs) {
      const docsErr = validateDocsStep({
        noDocuments: draft.noDocuments,
        invoiceFile: draft.invoiceFile,
        contractNumber: draft.contractNumber,
        contractDate: draft.contractDate,
        skipInvoiceRequirement: mode !== "app",
      });
      if (docsErr) {
        fields.push(...docsErr.fields);
        messages.push(docsErr.message);
      }
    }
    if (step === WIZARD_STEP.parties) {
      if (!hasClientOrg || !draft.organizationId) {
        fields.push("organizationId");
        messages.push("Сначала создайте организацию клиента");
      }
    }
    if (step === WIZARD_STEP.terms) {
      const amount = Number(String(draft.amount).replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        fields.push("amount");
        messages.push("Укажите сумму платежа больше нуля");
      }
      if (!draft.noDocuments) {
        if (draft.kind === "good" && !draft.hsCode.trim()) {
          fields.push("hsCode");
          messages.push(
            hsCodes.length === 0
              ? "Справочник кодов ТН ВЭД пуст — добавьте код в «Коды ТН ВЭД»"
              : "Для товара выберите код ТН ВЭД из справочника",
          );
        }
        if (
          draft.kind === "good" &&
          draft.condition === "advance" &&
          !draft.shipmentDate.trim() &&
          !draft.contractDate.trim()
        ) {
          fields.push("shipmentDate");
          messages.push("Для товара с авансом укажите дату отгрузки");
        }
      }
    }
    if (messages.length === 0) return null;
    return { message: messages.join(". "), fields };
  }

  async function ensureEarlyForm(): Promise<string> {
    if (formId) return formId;
    if (!hasClientOrg || !draft.organizationId) {
      throw new Error("Сначала создайте организацию клиента");
    }
    const created = await Promise.resolve(
      createForm({
        direction: draft.direction,
        kind: draft.kind,
        condition: draft.condition,
        organizationId: draft.organizationId,
        counterpartyId: draft.counterpartyId,
        amountMinor: Math.round(Number(draft.amount || 0) * 100),
        currency: derivedCurrency,
        clientCurrency: draft.clientCurrency,
        counterpartyCurrency: draft.counterpartyCurrency,
        hsCode: draft.hsCode || "—",
        invoiceNumber: draft.invoiceNumber || draft.contractNumber || "—",
        shipmentDate: draft.shipmentDate || undefined,
        noDocuments: draft.noDocuments,
        invoiceFile: draft.invoiceFile ?? undefined,
        contractFile: draft.contractFile ?? undefined,
        documents: [],
      } as Parameters<typeof createForm>[0]),
    );
    setFormId(created.id);
    if (mode === "app" && draft.condition) {
      await patchForm(created.id, nestFormPrefixForRole(session?.role ?? "user"), {
        payment_method: conditionToPaymentMethod(draft.condition, draft.direction),
        currency: derivedCurrency,
      });
    }
    return created.id;
  }

  const ensureMissingHs = useCallback(async (code: string): Promise<{ value: string; label: string } | null> => {
    try {
      const created = await ensureHsCodeFromOcr(code);
      const label = `${created.code} — ${created.description || "OCR"}`;
      setDraft((prev) => ({ ...prev, hsCode: created.code }));
      await queryClient.invalidateQueries({ queryKey: ["hs-codes"] });
      return { value: created.code, label };
    } catch {
      return null;
    }
  }, [queryClient]);

  useEffect(() => {
    if (!draft.hsCode || draft.hsCode === "—") return;
    if (hsCodes.some((h) => h.code === draft.hsCode)) return;
    void ensureMissingHs(draft.hsCode);
  }, [draft.hsCode, hsCodes, ensureMissingHs]);

  async function nextStep() {
    if (step === WIZARD_STEP.docs && !hasClientOrg) {
      setError("Нет организации клиента — создайте организацию, чтобы продолжить");
      setOrgDialogOpen(true);
      return;
    }
    const err = validateStep();
    if (
      err &&
      ocrBannerState === "pending" &&
      !ocrManualOverride &&
      !draft.noDocuments &&
      step >= WIZARD_STEP.direction
    ) {
      setSkipOcrPromptOpen(true);
      setError(null);
      setInvalidFields([]);
      return;
    }
    if (err) {
      setError(err.message);
      setInvalidFields(err.fields);
      return;
    }
    setError(null);
    setInvalidFields([]);
    if (step === WIZARD_STEP.docs && mode === "app" && !formId) {
      setBootstrapping(true);
      try {
        await ensureEarlyForm();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось создать черновик заявки");
        setBootstrapping(false);
        return;
      }
      setBootstrapping(false);
    }
    setStep(step + 1);
  }

  function requestSkipOcr() {
    setSkipOcrPromptOpen(true);
  }

  function confirmManualFill() {
    setOcrManualOverride(true);
    setSkipOcrPromptOpen(false);
    setError(null);
    setInvalidFields([]);
  }

  function declineManualFill() {
    setSkipOcrPromptOpen(false);
    setError("Дождитесь распознавания или выберите «Пропустить распознавание» и заполните поля вручную.");
  }

  async function syncFormFields(id: string): Promise<void> {
    const amount = String(draft.amount || "0").replace(/\s/g, "").replace(",", ".");
    const contractNumber = draft.contractNumber || draft.invoiceNumber || "";
    const patch: {
      invoice_amount: string;
      currency: string;
      payment_method: string;
      direction: FormDirection;
      kind: FormKind;
      contract_number?: string;
      contract_date?: string;
      organization_id?: string;
      counterparty_id?: string;
    } = {
      invoice_amount: amount,
      currency: derivedCurrency,
      payment_method: conditionToPaymentMethod(draft.condition, draft.direction),
      direction: draft.direction,
      kind: draft.kind,
    };
    if (contractNumber) patch.contract_number = contractNumber;
    const date = draft.shipmentDate || draft.contractDate;
    if (date) patch.contract_date = date;
    if (draft.organizationId) patch.organization_id = draft.organizationId;
    if (draft.counterpartyId) patch.counterparty_id = draft.counterpartyId;
    await patchForm(id, nestFormPrefixForRole(session?.role ?? "user"), patch);
    if (draft.hsCode && draft.hsCode !== "—") {
      await attachFormHsCodes(id, [draft.hsCode]);
    }
  }

  async function ensureDraftStatus(id: string): Promise<void> {
    if (mode !== "app") return;
    const current = await getForm(id);
    if (current.status === "creating") {
      await transitionForm(id, "recognize_complete");
    }
  }

  async function finalize(finalizeMode: FinalizeMode) {
    if (!hasClientOrg || !draft.organizationId) {
      setError("Сначала создайте организацию клиента");
      setOrgDialogOpen(true);
      return;
    }
    if (finalizeMode === "submit" && draft.noDocuments) {
      setError(NO_DOCUMENTS_DRAFT_ALERT);
      return;
    }
    const err = validateStep();
    if (err) {
      setError(err.message);
      setInvalidFields(err.fields);
      return;
    }
    setSubmitting(true);
    setError(null);
    setInvalidFields([]);
    try {
      let id = formId;
      if (!id) {
        id = await ensureEarlyForm();
      } else if (mode === "app") {
        await syncFormFields(id);
      } else {
        const created = await Promise.resolve(
          createForm({
            direction: draft.direction,
            kind: draft.kind,
            condition: draft.condition,
            organizationId: draft.organizationId,
            counterpartyId: draft.counterpartyId,
            amountMinor: Math.round(Number(draft.amount || 0) * 100),
            currency: derivedCurrency,
            clientCurrency: draft.clientCurrency,
            counterpartyCurrency: draft.counterpartyCurrency,
            hsCode: draft.hsCode || "—",
            invoiceNumber: draft.invoiceNumber || draft.contractNumber || "—",
            shipmentDate: draft.shipmentDate || undefined,
            noDocuments: draft.noDocuments,
            invoiceFile: draft.invoiceFile ?? undefined,
            contractFile: draft.contractFile ?? undefined,
            documents: [],
          } as Parameters<typeof createForm>[0]),
        );
        id = created.id;
      }
      if (mode === "app") {
        await syncFormFields(id);
        await ensureDraftStatus(id);
        if (finalizeMode === "submit") {
          await transitionForm(id, "submit");
        }
      }
      navigate({ to: `${base}/forms/$id` as "/forms/$id", params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить заявку");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VedAppShell
      title="Новая платёжная заявка"
      subtitle={
        mode === "demo"
          ? "Черновик создаётся локально; после create — CTA «Завершить распознавание» на статусе creating"
          : "Сначала документы — распознавание идёт параллельно заполнению формы"
      }
    >
      <div className="panel p-4">
        {draft.noDocuments ? (
          <div data-testid="wizard-steps">
            <p className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground inline-block">
              Черновик без документов
            </p>
            <p className="mt-3 text-xs text-muted-foreground" data-testid="wizard-step-caption">
              Укажите ориентировочную сумму и валюты, затем сохраните черновик.
            </p>
          </div>
        ) : (
          <>
            <ol className="flex flex-wrap gap-2" data-testid="wizard-steps">
              {WIZARD_STEPS.map((label, i) => (
                <li
                  key={label}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold",
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-done-soft text-done"
                        : "text-subtle-foreground",
                  )}
                >
                  {i + 1}. {label}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground" data-testid="wizard-step-caption">
              <span className="font-semibold text-foreground">{WIZARD_STEPS[step] ?? ""}: </span>
              {WIZARD_STEP_CAPTIONS[WIZARD_STEPS[step] ?? "Документы"]}
            </p>
          </>
        )}
      </div>

      <div className="panel mt-4 w-full p-5 lg:w-3/4">
        {error && <p className="mb-4 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{error}</p>}
        {ocrProgressVisible && ocrBannerState && step > WIZARD_STEP.docs && !draft.noDocuments && (
          <OcrProgress
            state={ocrBannerState}
            onHide={() => {
              if (ocrBannerState === "done") setOcrProgressVisible(false);
            }}
          />
        )}
        {formId && extractionMode !== "hide" && extractionTrigger && step > WIZARD_STEP.docs ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="wizard-extraction-dialog-trigger"
              className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
              onClick={() => setExtractionDialogOpen(true)}
            >
              {extractionTrigger}
            </button>
            {ocrBannerState === "pending" && !ocrManualOverride ? (
              <button
                type="button"
                data-testid="wizard-skip-ocr"
                className="flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                onClick={() => requestSkipOcr()}
              >
                Пропустить распознавание
              </button>
            ) : null}
            {ocrManualOverride && ocrBannerState === "pending" ? (
              <span className="text-xs text-muted-foreground" data-testid="wizard-ocr-manual-hint">
                Распознавание идёт в фоне — правки вручную имеют приоритет.
              </span>
            ) : null}
          </div>
        ) : null}
        {step === WIZARD_STEP.docs && (
          <div className="grid gap-4" data-testid="wizard-docs-step">
            {!hasClientOrg && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Нет организации клиента.{" "}
                <button
                  type="button"
                  className="font-semibold text-accent hover:underline"
                  onClick={() => setOrgDialogOpen(true)}
                >
                  Создать организацию
                </button>{" "}
                — без неё заявку создать нельзя.
              </p>
            )}
            {!draft.noDocuments && (
              <>
                <FileField label="Инвойс (PDF, до 15 МБ)" invalid={invalidFields.includes("invoiceFile")}>
                  <FilePickButton
                    file={draft.invoiceFile}
                    testId="wizard-invoice-file"
                    pickLabel="Выбрать инвойс"
                    onPick={(file) => onFilePick("invoiceFile", file)}
                  />
                </FileField>
                <p className="text-xs text-muted-foreground" data-testid="wizard-invoice-ocr-help">
                  Чаще достаточно инвойса. После «Далее» распознавание пойдёт в фоне; статус и предзаполнение
                  появятся на следующих шагах. Если сервис недоступен — заполните сумму и реквизиты вручную.
                </p>
                <FileField label="Контракт (PDF, до 15 МБ) — необязательно">
                  <FilePickButton
                    file={draft.contractFile}
                    testId="wizard-contract-file"
                    pickLabel="Выбрать контракт"
                    onPick={(file) => onFilePick("contractFile", file)}
                  />
                </FileField>
              </>
            )}
            <OrganizationPickDialog
              open={orgDialogOpen}
              onOpenChange={setOrgDialogOpen}
              role={session?.role}
              organizations={organizations}
              selectedId={draft.organizationId}
              onSelect={(id) => setField("organizationId", id)}
            />
          </div>
        )}

        {step === WIZARD_STEP.direction && !draft.noDocuments && (
          <div className="grid gap-4 sm:grid-cols-3" data-testid="wizard-direction-step">
            <Field label="Направление">
              <select
                value={draft.direction}
                onChange={(e) => setField("direction", e.target.value as FormDirection)}
                className="field"
              >
                <option value="import">Импорт</option>
                <option value="export">Экспорт</option>
              </select>
            </Field>
            <Field label="Предмет">
              <select value={draft.kind} onChange={(e) => setField("kind", e.target.value as FormKind)} className="field">
                <option value="good">Товар</option>
                <option value="service">Услуга</option>
              </select>
            </Field>
            <Field label="Условие оплаты с поставщиком">
              <select
                value={draft.condition}
                onChange={(e) => setField("condition", e.target.value as FormCondition)}
                className="field"
                data-testid="wizard-payment-condition"
              >
                <option value="advance">Аванс</option>
                <option value="postPayment">Постоплата</option>
              </select>
            </Field>
          </div>
        )}

        {step === WIZARD_STEP.parties && !draft.noDocuments && (
          <div className="grid gap-4" data-testid="wizard-parties-step">
            {!hasClientOrg && (
              <p
                className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
                data-testid="wizard-empty-organizations"
              >
                Нет организации клиента.{" "}
                <button
                  type="button"
                  className="font-semibold text-accent hover:underline"
                  data-testid="wizard-create-organization"
                  onClick={() => setOrgDialogOpen(true)}
                >
                  Создать организацию
                </button>{" "}
                — без неё заявку создать нельзя.
              </p>
            )}
            <Field label="Организация клиента">
              <div className="flex flex-wrap gap-2">
                <select
                  value={draft.organizationId}
                  onChange={(e) => setField("organizationId", e.target.value)}
                  className="field flex-1"
                  disabled={!hasClientOrg}
                >
                  {organizations.length === 0 && <option value="">Нет организаций</option>}
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} · ИНН {o.inn}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-xs font-semibold text-accent hover:bg-muted"
                  data-testid="wizard-create-org-btn"
                  onClick={() => setOrgDialogOpen(true)}
                >
                  Создать организацию
                </button>
              </div>
            </Field>
            <Field label="Контрагент">
              <div className="flex flex-wrap gap-2">
                <select
                  value={draft.counterpartyId}
                  onChange={(e) => setField("counterpartyId", e.target.value)}
                  className="field flex-1"
                >
                  {counterparties.length === 0 && <option value="">Нет контрагентов — создайте здесь</option>}
                  {counterparties.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.country}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-xs font-semibold text-accent hover:bg-muted"
                  data-testid="wizard-create-cp-btn"
                  onClick={() => setCpDialogOpen(true)}
                >
                  Создать контрагента
                </button>
              </div>
            </Field>
            {counterparties.length === 0 && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground" data-testid="wizard-empty-counterparties">
                Справочник контрагентов пуст. Создайте контрагента здесь или продолжите — документы можно догрузить на
                карточке заявки после сохранения.
              </p>
            )}
            <OrganizationPickDialog
              open={orgDialogOpen}
              onOpenChange={setOrgDialogOpen}
              role={session?.role}
              organizations={organizations}
              selectedId={draft.organizationId}
              onSelect={(id) => setField("organizationId", id)}
            />
            <CounterpartyPickDialog
              open={cpDialogOpen}
              onOpenChange={setCpDialogOpen}
              role={session?.role}
              counterparties={counterparties}
              selectedId={draft.counterpartyId}
              onSelect={(id) => setField("counterpartyId", id)}
            />
          </div>
        )}

        {step === WIZARD_STEP.terms && (
          <div className="grid gap-4" data-testid="wizard-terms-step">
            {draft.noDocuments && (
              <div
                className="flex flex-col gap-3 rounded-md border border-wait/40 bg-wait-soft px-3 py-3 sm:flex-row sm:items-start"
                data-testid="wizard-no-documents-alert"
              >
                <p className="min-w-0 flex-1 text-sm text-wait">{NO_DOCUMENTS_DRAFT_ALERT}</p>
                <button
                  type="button"
                  onClick={() => disableNoDocumentsPath()}
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  data-testid="wizard-add-documents"
                >
                  Добавить документы
                </button>
              </div>
            )}
            {!hasClientOrg && draft.noDocuments && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Нет организации клиента.{" "}
                <button
                  type="button"
                  className="font-semibold text-accent hover:underline"
                  onClick={() => setOrgDialogOpen(true)}
                >
                  Создать организацию
                </button>{" "}
                — без неё черновик сохранить нельзя.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Сумма инвойса" invalid={invalidFields.includes("amount")}>
                <input
                  value={draft.amount}
                  onChange={(e) => setTouchedField("amount", e.target.value)}
                  inputMode="decimal"
                  placeholder="сумма"
                  className="field font-mono"
                  data-testid="wizard-amount"
                />
              </Field>
              <Field label="Валюта клиента">
                <select
                  value={draft.clientCurrency}
                  onChange={(e) => setField("clientCurrency", e.target.value)}
                  className="field"
                  data-testid="wizard-client-currency"
                >
                  {currencyOptions.length === 0 && <option value="">Нет валют в справочнике</option>}
                  {currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Валюта контрагента">
                <select
                  value={draft.counterpartyCurrency}
                  onChange={(e) => setTouchedField("counterpartyCurrency", e.target.value)}
                  className="field"
                  data-testid="wizard-counterparty-currency"
                >
                  {currencyOptions.length === 0 && <option value="">Нет валют в справочнике</option>}
                  {currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              {!draft.noDocuments && draft.kind === "good" && (
                <Field label="Код ТН ВЭД" invalid={invalidFields.includes("hsCode")}>
                  <select
                    value={draft.hsCode}
                    onChange={(e) => setTouchedField("hsCode", e.target.value)}
                    className="field font-mono"
                    aria-label="Код ТН ВЭД из справочника"
                  >
                    <option value="">
                      {hsCodes.length === 0 ? "Справочник пуст — откройте «Коды ТН ВЭД»" : "Выберите из справочника"}
                    </option>
                    {draft.hsCode && !hsCodes.some((h) => h.code === draft.hsCode) ? (
                      <option value={draft.hsCode}>{draft.hsCode} · из OCR (добавляется…)</option>
                    ) : null}
                    {hsCodes.map((h) => (
                      <option key={h.code} value={h.code}>
                        {h.code} · {h.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {!draft.noDocuments && draft.kind === "good" && draft.condition === "advance" && (
                <Field
                  label="Дата отгрузки"
                  invalid={invalidFields.includes("shipmentDate")}
                  {...(draft.contractDate && !draft.shipmentDate
                    ? {
                        hint: "Подставлена дата контракта с шага «Документы» — измените, если отгрузка в другой день",
                      }
                    : {})}
                >
                  <input
                    type="date"
                    value={draft.shipmentDate || draft.contractDate}
                    onChange={(e) => setField("shipmentDate", e.target.value)}
                    className="field"
                  />
                </Field>
              )}
              {!draft.noDocuments && (
                <Field label="Номер инвойса">
                  <input
                    value={draft.invoiceNumber}
                    onChange={(e) => setTouchedField("invoiceNumber", e.target.value)}
                    placeholder="номер"
                    className="field font-mono"
                  />
                </Field>
              )}
            </div>
            {draft.noDocuments && (
              <OrganizationPickDialog
                open={orgDialogOpen}
                onOpenChange={setOrgDialogOpen}
                role={session?.role}
                organizations={organizations}
                selectedId={draft.organizationId}
                onSelect={(id) => setField("organizationId", id)}
              />
            )}
          </div>
        )}

        {step === WIZARD_STEP.review && !draft.noDocuments && (
          <div className="grid gap-4" data-testid="wizard-review-step">
            {!draft.noDocuments &&
              ocrBannerState === "pending" && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">{CREATE_REVIEW_OCR_BANNER}</p>
            )}
            {!draft.noDocuments && ocrBannerState === "degraded" && (
              <p
                className="rounded-md bg-wait-soft px-3 py-2 text-sm text-wait"
                data-testid="wizard-review-ocr-degraded"
              >
                Распознавание с ограничениями — на автоподстановку рассчитывать нельзя. Проверьте сумму и реквизиты
                вручную или откройте «Просмотр данных».
              </p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Направление", draft.direction === "import" ? "Импорт" : "Экспорт"],
                ["Предмет", draft.kind === "good" ? "Товар" : "Услуга"],
                ["Условие оплаты", draft.condition === "advance" ? "Аванс" : "Постоплата"],
                ["Организация", organizations.find((o) => o.id === draft.organizationId)?.name ?? ""],
                ["Контрагент", counterparties.find((c) => c.id === draft.counterpartyId)?.name ?? ""],
                ["Сумма", `${draft.amount || 0} ${derivedCurrency}`],
                ["Валюты", `${draft.clientCurrency} / ${draft.counterpartyCurrency}`],
                ["ТН ВЭД", draft.hsCode || "—"],
                [
                  "Документы",
                  documentsLabel(draft.noDocuments, Boolean(draft.invoiceFile), Boolean(draft.contractFile)),
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="label-caps">{k}</dt>
                  <dd className="text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {!draft.noDocuments && step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="shrink-0 rounded-md px-3 py-2.5 text-sm font-semibold bg-primary/[0.08] text-primary sm:bg-transparent sm:text-muted-foreground sm:hover:bg-muted"
              >
                ← Назад
              </button>
            )}
            <div className="flex flex-1 flex-wrap gap-2">
              {draft.noDocuments ? (
                <button
                  type="button"
                  onClick={() => void finalize("draft")}
                  disabled={submitting}
                  data-testid="wizard-save-draft"
                  className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "Сохранение…" : "Сохранить черновик"}
                </button>
              ) : step < WIZARD_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => void nextStep()}
                  disabled={bootstrapping}
                  className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {bootstrapping ? "Создание…" : "Далее"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void finalize("submit")}
                    disabled={submitting}
                    data-testid="wizard-send-manager"
                    className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    {submitting ? "Отправка…" : "Отправить менеджеру"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void finalize("draft")}
                    disabled={submitting}
                    data-testid="wizard-save-draft"
                    className="flex-1 rounded-md bg-muted px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50"
                  >
                    {submitting ? "Сохранение…" : "Сохранить черновик"}
                  </button>
                </>
              )}
            </div>
          </div>
          {step === WIZARD_STEP.docs && !draft.noDocuments && (
            <button
              type="button"
              onClick={() => enableNoDocumentsPath()}
              className="w-full rounded-md bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground"
              data-testid="wizard-no-documents"
            >
              У меня нет документов
            </button>
          )}
          {step === WIZARD_STEP.review && !draft.noDocuments && (
            <p className="text-xs text-muted-foreground">{CREATE_REVIEW_OCR_CAPTION}</p>
          )}
        </div>
      </div>
      <ExtractionReviewDialog
        open={extractionDialogOpen}
        onOpenChange={setExtractionDialogOpen}
        formId={formId ?? ""}
        invoiceJson={ocrInvoiceJson}
        role={session?.role ?? "user"}
        status="creating"
        hasDocuments={!draft.noDocuments}
        canConfirm
        currencyOptions={currencyOptions.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
        hsOptions={hsCodes.map((h) => ({ value: h.code, label: `${h.code} — ${h.name}` }))}
        onEnsureHsCode={ensureMissingHs}
      />
      {skipOcrPromptOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="wizard-skip-ocr-dialog"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-foreground">Заполнить вручную?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Распознавание продолжится в фоне. Если да — заполните сумму и реквизиты сами. Если нет — дождитесь
              результата или откройте «Распознавание».
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                data-testid="wizard-skip-ocr-yes"
                onClick={() => confirmManualFill()}
              >
                Да, заполнить вручную
              </button>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground"
                data-testid="wizard-skip-ocr-no"
                onClick={() => declineManualFill()}
              >
                Нет, ждать
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </VedAppShell>
  );
}

function Field({
  label,
  hint,
  invalid = false,
  children,
}: {
  label: string;
  hint?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-full flex-col">
      <span className={cn("label-caps", invalid && "text-destructive")}>{label}</span>
      <div
        className={cn(
          "mt-auto pt-1",
          invalid &&
            "[&_.field]:border-destructive [&_.field]:ring-1 [&_.field]:ring-destructive/30 [&_button]:border-destructive",
        )}
      >
        {children}
      </div>
      {invalid && <span className="mt-1 block text-xs font-semibold text-destructive">Заполните это поле</span>}
      {hint && !invalid && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/**
 * Wrapper for FilePickButton: root must be a div, not a wrapping label.
 * A label around input[type=file] + programmatic openPicker() opens the OS dialog twice.
 */
function FileField({
  label,
  invalid = false,
  children,
}: {
  label: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col" data-testid="wizard-file-field">
      <span className={cn("label-caps", invalid && "text-destructive")}>{label}</span>
      <div className="mt-auto pt-1">{children}</div>
      {invalid && <span className="mt-1 block text-xs font-semibold text-destructive">Заполните это поле</span>}
    </div>
  );
}

