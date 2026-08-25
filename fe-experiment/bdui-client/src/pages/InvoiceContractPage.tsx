import { useState, type ChangeEvent, type FormEvent } from 'react';
import Background from '../assets/invoice/screen-background.svg?react';
import ContinueArrow from '../assets/invoice/continue-arrow.svg?react';
import EditPencil from '../assets/invoice/edit-pencil.svg?react';
import StatusIcons from '../assets/invoice/status-icons.svg?react';
import { DocumentUploadCard } from '../components/invoice/DocumentUploadCard';
import {
  formatDocumentName,
  MAX_DOCUMENT_BYTES,
} from '../types/invoice';
import type {
  InvoiceContractPageProps,
  InvoiceContractValues,
  InvoiceDocumentKind,
} from '../types/invoice';

const DOCUMENT_LABELS: Record<InvoiceDocumentKind, string> = {
  invoice: 'Добавить инвойс',
  contract: 'Добавить контракт',
};

type DocumentFiles = Record<InvoiceDocumentKind, File | null>;
type DocumentErrors = Record<InvoiceDocumentKind, string | undefined>;

function validatePdfFile(file: File): string | null {
  const isPdfType = !file.type || file.type === 'application/pdf';
  const isPdfName = file.name.toLowerCase().endsWith('.pdf');

  if (!isPdfType || !isPdfName) {
    return 'выберите PDF-файл.';
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'размер файла не должен превышать 15 Мб.';
  }
  return null;
}

export function InvoiceContractPage(props: InvoiceContractPageProps): JSX.Element {
  const [documents, setDocuments] = useState<DocumentFiles>({
    invoice: null,
    contract: null,
  });
  const [documentErrors, setDocumentErrors] = useState<DocumentErrors>({
    invoice: undefined,
    contract: undefined,
  });
  const [noDocuments, setNoDocuments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');

  function handleFileChange(
    kind: InvoiceDocumentKind,
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    const validationError = validatePdfFile(file);
    if (validationError) {
      event.currentTarget.value = '';
      setDocuments((previous) => ({ ...previous, [kind]: null }));
      setDocumentErrors((previous) => ({
        ...previous,
        [kind]: validationError,
      }));
      setLiveMessage(`${DOCUMENT_LABELS[kind]}: ${validationError}`);
      return;
    }

    setDocuments((previous) => ({ ...previous, [kind]: file }));
    setDocumentErrors((previous) => ({ ...previous, [kind]: undefined }));
    setLiveMessage(`${DOCUMENT_LABELS[kind]} добавлен: ${formatDocumentName(file.name)}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const values: InvoiceContractValues = {
      invoice: documents.invoice,
      contract: documents.contract,
      noDocuments,
    };

    try {
      await props.onContinue?.(values);
      setLiveMessage('Данные платежа готовы к продолжению.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось продолжить.';
      setFormError(message);
      setLiveMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      aria-label="Создание платежа, шаг 1 из 7"
      className="invoice-screen"
    >
      <Background
        aria-hidden="true"
        className="invoice-screen__background"
        focusable="false"
      />
      <div className="invoice-screen__clock" aria-hidden="true">
        {props.timeLabel ?? '9:30'}
      </div>
      <StatusIcons
        aria-label="Состояние сети и батареи"
        className="invoice-screen__status-icons"
        role="img"
      />

      <header aria-label="Заголовок платежа" className="invoice-screen__header">
        <p className="invoice-screen__header-title">Создание платежа</p>
        <button
          aria-label="Изменить платеж"
          className="invoice-screen__edit-button"
          onClick={props.onEditPayment}
          title="Изменить платеж"
          type="button"
        >
          <EditPencil
            aria-hidden="true"
            className="invoice-screen__edit-icon"
            focusable="false"
          />
        </button>
      </header>

      <section aria-labelledby="invoice-title" className="invoice-screen__title-section">
        <h1 className="invoice-screen__title" id="invoice-title">
          Инвойс
          <br />
          и контракт
        </h1>
        <p className="invoice-screen__progress">Шаг 1 из 7</p>
      </section>

      <form
        aria-label="Документы для платежа"
        className="invoice-screen__form"
        onSubmit={handleSubmit}
      >
        <p className="invoice-screen__instructions">Загрузите имеющиеся документы:</p>
        <div className="invoice-screen__upload-grid">
          <DocumentUploadCard
            errorMessage={documentErrors.invoice}
            file={documents.invoice}
            inputId="invoice-upload"
            kind="invoice"
            label={DOCUMENT_LABELS.invoice}
            onChange={(event) => handleFileChange('invoice', event)}
          />
          <DocumentUploadCard
            errorMessage={documentErrors.contract}
            file={documents.contract}
            inputId="contract-upload"
            kind="contract"
            label={DOCUMENT_LABELS.contract}
            onChange={(event) => handleFileChange('contract', event)}
          />
        </div>

        <label className="invoice-no-documents" htmlFor="no-documents">
          <input
            checked={noDocuments}
            className="invoice-no-documents__input invoice-visually-hidden"
            id="no-documents"
            onChange={(event) => setNoDocuments(event.currentTarget.checked)}
            type="checkbox"
          />
          <span aria-hidden="true" className="invoice-no-documents__box" />
          <span className="invoice-no-documents__label">У меня нет документов</span>
        </label>

        <button
          aria-busy={isSubmitting}
          className="invoice-screen__submit-button"
          disabled={isSubmitting}
          type="submit"
        >
          <span className="invoice-screen__submit-label">Продолжить</span>
          <ContinueArrow
            aria-hidden="true"
            className="invoice-screen__submit-arrow"
            focusable="false"
          />
        </button>
        {formError ? (
          <p className="invoice-screen__form-error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>

      <p aria-live="polite" className="invoice-visually-hidden">
        {liveMessage}
      </p>
    </main>
  );
}
