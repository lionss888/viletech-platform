import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CounterpartyPickDialog } from "@/components/ved/CounterpartyPickDialog";
import { OrganizationPickDialog } from "@/components/ved/OrganizationPickDialog";
import { VedAppShell } from "@/components/ved/VedAppShell";
import {
  attachFormHsCodes,
  getForm,
  nestFormPrefixForRole,
  patchForm,
  transitionForm,
} from "@/lib/api/forms";
import { assertFileSize, UploadError } from "@/lib/api/files";
import {
  CREATE_REVIEW_OCR_BANNER,
  CREATE_REVIEW_OCR_CAPTION,
  CREATE_REVIEW_OCR_PENDING,
} from "@/lib/ved/create-review-copy";
import { parseExtractionResult } from "@/lib/ved/extraction";
import { usePlatformBasePath, usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";
import { sortCurrencyRecords } from "@/lib/ved/sort-currencies";
import type { FormCondition, FormDirection, FormKind } from "@/lib/ved/types";
import {
  conditionToPaymentMethod,
  deriveInvoiceCurrency,
  documentsLabel,
  mergeExtractionPrefill,
  WIZARD_STEP,
  WIZARD_STEPS,
  type WizardTouched,
} from "@/lib/ved/wizard-steps";
import { cn } from "@/lib/utils";

type FinalizeMode = "draft" | "submit";

export function NewForm() {
  const { organizations, counterparties, currencies, hsCodes, createForm, session } = usePlatformStore();
  const navigate = useNavigate();
  const base = usePlatformBasePath();
  const mode = usePlatformMode();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [cpDialogOpen, setCpDialogOpen] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);
  const touchedRef = useRef<WizardTouched>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const applyOcrPrefill = useCallback((invoiceJson: string | undefined | null) => {
    const extraction = parseExtractionResult(invoiceJson);
    if (!extraction) return;
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
    setOcrReady(true);
    setOcrPending(false);
  }, []);

  useEffect(() => {
    if (!formId || mode !== "app" || draft.noDocuments || ocrReady) return;
    setOcrPending(true);
    const tick = async () => {
      try {
        const form = await getForm(formId);
        if (form.invoice_json?.trim()) {
          applyOcrPrefill(form.invoice_json);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        /* keep polling */
      }
    };
    void tick();
    pollRef.current = setInterval(() => void tick(), 1500);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [formId, mode, draft.noDocuments, ocrReady, applyOcrPrefill]);

  function setField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
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

  function validateStep(): string | null {
    if (step === WIZARD_STEP.docs && !draft.noDocuments) {
      if (!draft.invoiceFile && mode === "app") {
        return "Загрузите инвойс или выберите «У меня нет документов»";
      }
    }
    if (step === WIZARD_STEP.docs && draft.noDocuments) {
      if (!draft.contractNumber.trim() || !draft.contractDate.trim()) {
        return "Без документов укажите номер и дату контракта вручную";
      }
    }
    if (step === WIZARD_STEP.parties) {
      if (!hasClientOrg || !draft.organizationId) {
        return "Сначала создайте организацию клиента";
      }
    }
    if (step === WIZARD_STEP.terms) {
      const amount = Number(String(draft.amount).replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        return "Укажите сумму платежа больше нуля";
      }
      if (draft.kind === "good" && !draft.hsCode.trim()) {
        return hsCodes.length === 0
          ? "Справочник кодов ТН ВЭД пуст — добавьте код в «Коды ТН ВЭД»"
          : "Для товара выберите код ТН ВЭД из справочника";
      }
      if (draft.kind === "good" && draft.condition === "advance" && !draft.shipmentDate.trim()) {
        return "Для товара с авансом укажите дату отгрузки";
      }
    }
    return null;
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
        invoiceNumber: draft.noDocuments ? draft.contractNumber : draft.invoiceNumber || "—",
        shipmentDate: draft.shipmentDate || undefined,
        noDocuments: draft.noDocuments,
        invoiceFile: draft.invoiceFile ?? undefined,
        contractFile: draft.contractFile ?? undefined,
        documents: [],
      } as Parameters<typeof createForm>[0]),
    );
    setFormId(created.id);
    if (mode === "app" && !draft.noDocuments) {
      setOcrPending(true);
    }
    if (mode === "app" && draft.condition) {
      await patchForm(created.id, nestFormPrefixForRole(session?.role ?? "user"), {
        payment_method: conditionToPaymentMethod(draft.condition),
        currency: derivedCurrency,
      });
    }
    return created.id;
  }

  async function nextStep() {
    if (step === WIZARD_STEP.docs && !hasClientOrg) {
      setError("Нет организации клиента — создайте организацию, чтобы продолжить");
      setOrgDialogOpen(true);
      return;
    }
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
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

  async function syncFormFields(id: string): Promise<void> {
    const amount = String(draft.amount || "0").replace(/\s/g, "").replace(",", ".");
    const contractNumber = draft.noDocuments
      ? draft.contractNumber
      : draft.contractNumber || draft.invoiceNumber || "";
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
      payment_method: conditionToPaymentMethod(draft.condition),
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
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
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
            invoiceNumber: draft.noDocuments ? draft.contractNumber : draft.invoiceNumber || "—",
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
        <ol className="flex flex-wrap gap-2" data-testid="wizard-steps">
          {WIZARD_STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-done-soft text-done" : "text-subtle-foreground",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="panel mt-4 max-w-2xl p-5">
        {error && <p className="mb-4 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{error}</p>}
        {ocrPending && !ocrReady && step > WIZARD_STEP.docs && (
          <p className="mb-4 rounded-md bg-wait-soft px-3 py-2 text-sm text-wait" data-testid="wizard-ocr-pending">
            {CREATE_REVIEW_OCR_PENDING}
          </p>
        )}

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
            <button
              type="button"
              onClick={() => setField("noDocuments", !draft.noDocuments)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold",
                draft.noDocuments ? "bg-wait-soft text-wait" : "bg-muted text-muted-foreground",
              )}
              data-testid="wizard-no-documents"
            >
              {draft.noDocuments ? "✓ У меня нет документов" : "У меня нет документов"}
            </button>
            {!draft.noDocuments && (
              <>
                <Field label="Инвойс (PDF, до 15 МБ)">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    data-testid="wizard-invoice-file"
                    onChange={(e) => onFilePick("invoiceFile", e.target.files?.[0] ?? null)}
                    className="text-xs text-muted-foreground"
                  />
                </Field>
                <Field label="Контракт (PDF, до 15 МБ) — необязательно">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    data-testid="wizard-contract-file"
                    onChange={(e) => onFilePick("contractFile", e.target.files?.[0] ?? null)}
                    className="text-xs text-muted-foreground"
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Чаще достаточно инвойса. После «Далее» распознавание пойдёт в фоне — можно заполнять форму дальше.
                </p>
              </>
            )}
            {draft.noDocuments && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Номер контракта">
                  <input
                    value={draft.contractNumber}
                    onChange={(e) => setTouchedField("contractNumber", e.target.value)}
                    className="field font-mono"
                  />
                </Field>
                <Field label="Дата контракта">
                  <input
                    type="date"
                    value={draft.contractDate}
                    onChange={(e) => setField("contractDate", e.target.value)}
                    className="field"
                  />
                </Field>
              </div>
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

        {step === WIZARD_STEP.direction && (
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

        {step === WIZARD_STEP.parties && (
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
          <div className="grid gap-4 sm:grid-cols-2" data-testid="wizard-terms-step">
            <Field label="Сумма инвойса">
              <input
                value={draft.amount}
                onChange={(e) => setTouchedField("amount", e.target.value)}
                inputMode="decimal"
                placeholder="1250000"
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
            {draft.kind === "good" && (
              <Field label="Код ТН ВЭД">
                <select
                  value={draft.hsCode}
                  onChange={(e) => setTouchedField("hsCode", e.target.value)}
                  className="field font-mono"
                  aria-label="Код ТН ВЭД из справочника"
                >
                  <option value="">
                    {hsCodes.length === 0 ? "Справочник пуст — откройте «Коды ТН ВЭД»" : "Выберите из справочника"}
                  </option>
                  {hsCodes.map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} · {h.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {draft.kind === "good" && draft.condition === "advance" && (
              <Field label="Дата отгрузки">
                <input
                  type="date"
                  value={draft.shipmentDate}
                  onChange={(e) => setField("shipmentDate", e.target.value)}
                  className="field"
                />
              </Field>
            )}
            <Field label="Номер инвойса">
              <input
                value={draft.invoiceNumber}
                onChange={(e) => setTouchedField("invoiceNumber", e.target.value)}
                placeholder="INV-2026-0001"
                className="field font-mono"
              />
            </Field>
          </div>
        )}

        {step === WIZARD_STEP.review && (
          <div className="grid gap-4" data-testid="wizard-review-step">
            {!draft.noDocuments && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">{CREATE_REVIEW_OCR_BANNER}</p>
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
          <div className="flex flex-wrap gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                Назад
              </button>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => void nextStep()}
                disabled={bootstrapping}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {bootstrapping ? "Создание…" : "Далее"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void finalize("draft")}
                  disabled={submitting}
                  data-testid="wizard-save-draft"
                  className="rounded-md bg-muted px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                >
                  {submitting ? "Сохранение…" : "Сохранить черновик"}
                </button>
                <button
                  type="button"
                  onClick={() => void finalize("submit")}
                  disabled={submitting}
                  data-testid="wizard-send-manager"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  {submitting ? "Отправка…" : "Отправить менеджеру"}
                </button>
              </>
            )}
          </div>
          {step === WIZARD_STEP.review && !draft.noDocuments && (
            <p className="text-xs text-muted-foreground">{CREATE_REVIEW_OCR_CAPTION}</p>
          )}
        </div>
      </div>
    </VedAppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
