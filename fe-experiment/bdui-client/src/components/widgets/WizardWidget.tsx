import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest, apiUploadFile, replacePathParams } from '../../api/client';
import type { BduiAction, BduiField, BduiWizardWidget } from '../../types/bdui';
import { InlineDirectoryPanel } from './InlineDirectoryPanel';

type WizardWidgetProps = {
  widget: BduiWizardWidget;
  actions: BduiAction[];
  onCompleted: (formId: string) => void;
};

type OrganizationOption = {
  _id: string;
  name?: string;
  inn?: string;
  legalAddress?: string;
};

type PaginatedOrgs = {
  docs?: OrganizationOption[];
  items?: OrganizationOption[];
};

type CurrencyRow = {
  symbol?: string;
  active?: boolean;
};

type CounterpartyOption = {
  _id: string;
  name?: string;
  country?: string;
};

type PaginatedCounterparties = {
  docs?: CounterpartyOption[];
  items?: CounterpartyOption[];
};

type PaginatedCurrencies = {
  docs?: CurrencyRow[];
  items?: CurrencyRow[];
};

type FormPaymentResponse = {
  _id?: string;
  invoices?: Array<{ uuid?: string }>;
};

type UploadedFile = {
  _id: string;
};

const MAX_PDF_BYTES = 15 * 1024 * 1024;

function findAction(actions: BduiAction[], actionId: string): BduiAction | undefined {
  return actions.find((action) => action.id === actionId);
}

function buildDefaultValues(fields: BduiField[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      values[field.name] = field.defaultValue;
    }
  }
  return values;
}

function validatePdf(file: File): string | null {
  const isPdfType = !file.type || file.type === 'application/pdf';
  const isPdfName = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType || !isPdfName) {
    return 'выберите PDF-файл';
  }
  if (file.size > MAX_PDF_BYTES) {
    return 'размер файла не должен превышать 15 Мб';
  }
  return null;
}

function parseApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ошибка отправки';
  }
  const raw = error.message;
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join('; ');
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    /* plain text */
  }
  return raw;
}

/**
 * Multi-step create wizard: documents → deal → organization → submit to verification.
 */
export function WizardWidget(props: WizardWidgetProps): JSX.Element {
  const { widget, actions } = props;
  const createAction = findAction(actions, widget.createAction);
  const saveAction = findAction(actions, widget.saveAction);
  const uploadAction = findAction(actions, widget.uploadAction);
  const invoiceAction = findAction(actions, widget.invoiceAction);
  const hsCodesAction = findAction(actions, widget.hsCodesAction);
  const submitAction = findAction(actions, widget.submitAction);
  const allFields = useMemo(
    () => widget.steps.flatMap((step) => step.fields),
    [widget.steps],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildDefaultValues(allFields),
  );
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyOption[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [orgsRefreshKey, setOrgsRefreshKey] = useState(0);
  const [counterpartiesRefreshKey, setCounterpartiesRefreshKey] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentStep = widget.steps[stepIndex];
  const isLastStep = stepIndex === widget.steps.length - 1;

  useEffect(() => {
    let cancelled = false;
    async function loadOrganizations(): Promise<void> {
      try {
        const data = await apiRequest<PaginatedOrgs | OrganizationOption[]>(
          widget.organizationsDataSource.path,
          { method: widget.organizationsDataSource.method },
        );
        if (cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : data.docs ?? data.items ?? [];
        setOrganizations(list);
        if (list.length === 1 && !values.organization) {
          setValues((previous) => ({ ...previous, organization: list[0]._id }));
        }
      } catch {
        /* shown on submit if org required */
      }
    }
    void loadOrganizations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load orgs once per data source
  }, [widget.organizationsDataSource.method, widget.organizationsDataSource.path, orgsRefreshKey]);

  useEffect(() => {
    if (!widget.counterpartiesDataSource) {
      return;
    }
    let cancelled = false;
    async function loadCounterparties(): Promise<void> {
      try {
        const data = await apiRequest<PaginatedCounterparties | CounterpartyOption[]>(
          widget.counterpartiesDataSource!.path,
          { method: widget.counterpartiesDataSource!.method },
        );
        if (cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : data.docs ?? data.items ?? [];
        setCounterparties(list);
      } catch {
        /* optional field */
      }
    }
    void loadCounterparties();
    return () => {
      cancelled = true;
    };
  }, [
    widget.counterpartiesDataSource?.method,
    widget.counterpartiesDataSource?.path,
    counterpartiesRefreshKey,
  ]);

  useEffect(() => {
    if (!widget.currenciesDataSource) {
      return;
    }
    let cancelled = false;
    async function loadCurrencies(): Promise<void> {
      try {
        const data = await apiRequest<PaginatedCurrencies | CurrencyRow[]>(
          widget.currenciesDataSource!.path,
          { method: widget.currenciesDataSource!.method },
        );
        if (cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : data.docs ?? data.items ?? [];
        const symbols = new Set<string>();
        for (const row of list) {
          if (row.symbol && row.active !== false) {
            symbols.add(row.symbol.toLowerCase());
          }
        }
        const options = [...symbols]
          .sort()
          .map((symbol) => ({ value: symbol, label: symbol.toUpperCase() }));
        setCurrencyOptions(options);
      } catch {
        /* fallback to field.options if any */
      }
    }
    void loadCurrencies();
    return () => {
      cancelled = true;
    };
  }, [widget.currenciesDataSource?.method, widget.currenciesDataSource?.path]);

  function resolveSelectOptions(field: BduiField): Array<{ value: string; label: string }> {
    if (
      (field.name === 'currencyClient' || field.name === 'currencyCounterparty') &&
      currencyOptions.length > 0
    ) {
      return currencyOptions;
    }
    return field.options ?? [];
  }

  function updateValue(name: string, value: string): void {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  function handleFileChange(field: BduiField, event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const validationError = validatePdf(file);
    if (validationError) {
      event.currentTarget.value = '';
      setErrorMessage(`${field.label}: ${validationError}`);
      setFiles((previous) => ({ ...previous, [field.name]: null }));
      return;
    }
    setErrorMessage(null);
    setFiles((previous) => ({ ...previous, [field.name]: file }));
    updateValue('noDocuments', '');
  }

  function validateCurrentStep(): string | null {
    const noDocuments = values.noDocuments === 'true';
    for (const field of currentStep.fields) {
      if (field.fieldType === 'file') {
        if (!noDocuments && field.required && !files[field.name]) {
          return `Заполните поле: ${field.label}`;
        }
        continue;
      }
      if (field.fieldType === 'checkbox') {
        continue;
      }
      if (field.required && !values[field.name]) {
        return `Заполните поле: ${field.label}`;
      }
      if (field.name === 'hsCode' && values.kind === 'good') {
        const code = values.hsCode?.replace(/\s+/g, '') ?? '';
        if (!/^[0-9]{4,12}$/.test(code)) {
          return 'Код ТН ВЭД: 4–12 цифр без пробелов';
        }
      }
    }
    if (currentStep.id === 'documents' && !noDocuments) {
      const hasAnyFile = Boolean(files.invoiceFile || files.contractFile);
      if (!hasAnyFile) {
        return 'Загрузите документ или отметьте «Нет документов»';
      }
    }
    return null;
  }

  async function uploadIfPresent(file: File | null | undefined): Promise<string | undefined> {
    if (!file || !uploadAction) {
      return undefined;
    }
    const uploaded = await apiUploadFile<UploadedFile>({
      path: uploadAction.path,
      file,
    });
    return uploaded._id;
  }

  async function submitWizard(): Promise<void> {
    if (!createAction || !saveAction || !invoiceAction || !submitAction) {
      throw new Error('Wizard actions incomplete in schema');
    }
    const invoiceFileId = await uploadIfPresent(files.invoiceFile);
    const contractFileId = await uploadIfPresent(files.contractFile);
    const created = await apiRequest<FormPaymentResponse>(createAction.path, {
      method: createAction.method,
      body: {
        direction: values.direction,
        paymentMethod: values.paymentMethod,
        ...(contractFileId ? { contract: contractFileId } : {}),
      },
    });
    const formId = created._id;
    if (!formId) {
      throw new Error('Create response missing _id');
    }
    const amountMajor = Number(values.amount);
    const amountMinor = Number.isFinite(amountMajor) ? Math.round(amountMajor * 100) : undefined;
    const currencyClient = (values.currencyClient || '').toLowerCase();
    const currencyCounterparty = (values.currencyCounterparty || '').toLowerCase();
    const patchBody: Record<string, unknown> = {
      direction: values.direction,
      paymentMethod: values.paymentMethod,
      platformPaymentCondition: values.platformPaymentCondition,
      currencyClient,
      currencyCounterparty,
      amount: amountMinor,
      organization: values.organization,
    };
    if (values.counterpartyRef) {
      patchBody.counterpartyRef = values.counterpartyRef;
    }
    if (invoiceFileId) {
      patchBody.addAdditional = [invoiceFileId];
    }
    await apiRequest(replacePathParams(saveAction.path, { formId }), {
      method: saveAction.method,
      body: patchBody,
    });
    const invoiceBody: Record<string, unknown> = {
      kind: values.kind,
      deadlineShipment: values.deadlineShipment
        ? new Date(values.deadlineShipment).toISOString()
        : undefined,
    };
    if (invoiceFileId) {
      invoiceBody.file = invoiceFileId;
    }
    const withInvoice = await apiRequest<FormPaymentResponse>(
      replacePathParams(invoiceAction.path, { formId }),
      {
        method: invoiceAction.method,
        body: invoiceBody,
      },
    );
    const invoiceUuid = withInvoice.invoices?.[withInvoice.invoices.length - 1]?.uuid;
    if (values.kind === 'good' && values.hsCode && invoiceUuid && hsCodesAction) {
      const codes = [values.hsCode.replace(/\s+/g, '')];
      try {
        await apiRequest(
          replacePathParams(hsCodesAction.path, { formId, invoiceUuid }),
          {
            method: hsCodesAction.method,
            body: { codes },
          },
        );
      } catch (hsError) {
        // HS registry may be empty in experiment env — keep draft, surface warning then accept
        console.warn('HS codes update skipped:', parseApiError(hsError));
      }
    }
    await apiRequest(replacePathParams(submitAction.path, { formId }), {
      method: submitAction.method,
    });
    props.onCompleted(formId);
  }

  async function handleNext(event: FormEvent): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    const stepError = validateCurrentStep();
    if (stepError) {
      setErrorMessage(stepError);
      return;
    }
    if (!isLastStep) {
      setStepIndex((previous) => previous + 1);
      return;
    }
    setIsBusy(true);
    try {
      await submitWizard();
    } catch (error) {
      setErrorMessage(parseApiError(error));
    } finally {
      setIsBusy(false);
    }
  }

  function renderField(field: BduiField): JSX.Element {
    if (field.fieldType === 'file') {
      const selected = files[field.name];
      const disabled = values.noDocuments === 'true';
      return (
        <label key={field.name} className="bdui-field">
          <span>{field.label}</span>
          {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
          <input
            type="file"
            accept={field.accept ?? 'application/pdf,.pdf'}
            disabled={disabled || isBusy}
            onChange={(event) => handleFileChange(field, event)}
          />
          {selected ? <span className="bdui-muted">{selected.name}</span> : null}
        </label>
      );
    }
    if (field.fieldType === 'checkbox') {
      return (
        <label key={field.name} className="bdui-field bdui-field--checkbox">
          <input
            type="checkbox"
            checked={values[field.name] === 'true'}
            disabled={isBusy}
            onChange={(event) => {
              updateValue(field.name, event.target.checked ? 'true' : '');
              if (event.target.checked) {
                setFiles({});
              }
            }}
          />
          <span>{field.label}</span>
          {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
        </label>
      );
    }
    if (field.fieldType === 'organization_select') {
      return (
        <label key={field.name} className="bdui-field">
          <span>{field.label}</span>
          {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
          <select
            required={field.required}
            value={values[field.name] ?? ''}
            disabled={isBusy}
            onChange={(event) => updateValue(field.name, event.target.value)}
          >
            <option value="">—</option>
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name ?? org._id}
                {org.inn ? ` · ИНН ${org.inn}` : ''}
                {org.legalAddress ? ` · ${org.legalAddress}` : ''}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (field.fieldType === 'counterparty_select') {
      return (
        <label key={field.name} className="bdui-field">
          <span>{field.label}</span>
          {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
          <select
            required={field.required}
            value={values[field.name] ?? ''}
            disabled={isBusy}
            onChange={(event) => updateValue(field.name, event.target.value)}
          >
            <option value="">—</option>
            {counterparties.map((counterparty) => (
              <option key={counterparty._id} value={counterparty._id}>
                {counterparty.name ?? counterparty._id}
                {counterparty.country ? ` · ${counterparty.country}` : ''}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (field.fieldType === 'select') {
      return (
        <label key={field.name} className="bdui-field">
          <span>{field.label}</span>
          {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
          <select
            required={field.required}
            value={values[field.name] ?? ''}
            disabled={isBusy}
            onChange={(event) => updateValue(field.name, event.target.value)}
          >
            <option value="">—</option>
            {(resolveSelectOptions(field) ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    return (
      <label key={field.name} className="bdui-field">
        <span>{field.label}</span>
        {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
        <input
          type={field.fieldType}
          required={field.required}
          value={values[field.name] ?? ''}
          disabled={isBusy}
          onChange={(event) => updateValue(field.name, event.target.value)}
        />
      </label>
    );
  }

  const stepInlineCreates = (widget.inlineCreates ?? []).filter(
    (item) => item.stepId === currentStep.id,
  );

  function handleInlineCreated(targetField: string, entityId: string, actionId: string): void {
    updateValue(targetField, entityId);
    setErrorMessage(null);
    if (actionId === 'create_organization') {
      setOrgsRefreshKey((previous) => previous + 1);
    }
    if (actionId === 'create_counterparty') {
      setCounterpartiesRefreshKey((previous) => previous + 1);
    }
  }

  if (!createAction || !saveAction || !submitAction) {
    return <p className="bdui-error">Wizard schema incomplete: missing actions</p>;
  }

  return (
    <form className="bdui-wizard" onSubmit={(event) => void handleNext(event)}>
      <ol className="bdui-wizard-steps" aria-label="Шаги создания заявки">
        {widget.steps.map((step, index) => (
          <li
            key={step.id}
            className={
              index === stepIndex
                ? 'bdui-wizard-step bdui-wizard-step--current'
                : index < stepIndex
                  ? 'bdui-wizard-step bdui-wizard-step--done'
                  : 'bdui-wizard-step'
            }
          >
            <span className="bdui-wizard-step-index">{index + 1}</span>
            <span>{step.title}</span>
          </li>
        ))}
      </ol>
      <div className="bdui-wizard-panel">
        <h2>{currentStep.title}</h2>
        {currentStep.description ? <p className="bdui-muted">{currentStep.description}</p> : null}
        <div className="bdui-wizard-fields">{currentStep.fields.map(renderField)}</div>
        {stepInlineCreates.map((inlineSpec) => {
          const inlineAction = findAction(actions, inlineSpec.actionId);
          if (!inlineAction) {
            return null;
          }
          return (
            <InlineDirectoryPanel
              key={inlineSpec.actionId}
              action={inlineAction}
              panelTitle={inlineSpec.panelTitle}
              isBusy={isBusy}
              onError={setErrorMessage}
              onCreated={(entityId) =>
                handleInlineCreated(inlineSpec.targetField, entityId, inlineSpec.actionId)
              }
            />
          );
        })}
      </div>
      {errorMessage ? <p className="bdui-error">{errorMessage}</p> : null}
      <div className="bdui-wizard-actions">
        {stepIndex > 0 ? (
          <button
            type="button"
            className="bdui-button-secondary"
            disabled={isBusy}
            onClick={() => {
              setErrorMessage(null);
              setStepIndex((previous) => previous - 1);
            }}
          >
            Назад
          </button>
        ) : null}
        <button type="submit" disabled={isBusy}>
          {isBusy ? '…' : isLastStep ? submitAction.label : 'Далее'}
        </button>
      </div>
    </form>
  );
}
