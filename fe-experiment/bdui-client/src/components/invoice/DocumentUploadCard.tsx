import type { ChangeEvent } from 'react';
import AddPlus from '../../assets/invoice/add-plus.svg?react';
import { formatDocumentName } from '../../types/invoice';
import type { InvoiceDocumentKind } from '../../types/invoice';

type DocumentUploadCardProps = {
  kind: InvoiceDocumentKind;
  inputId: string;
  label: string;
  file: File | null;
  errorMessage?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function DocumentUploadCard(props: DocumentUploadCardProps): JSX.Element {
  const constraintsId = `${props.inputId}-constraints`;
  const errorId = `${props.inputId}-error`;
  const describedBy = props.errorMessage ? `${constraintsId} ${errorId}` : constraintsId;
  const title = props.file ? formatDocumentName(props.file.name) : props.label;

  return (
    <label
      className="invoice-upload-card"
      data-document-kind={props.kind}
      htmlFor={props.inputId}
    >
      <input
        accept="application/pdf"
        aria-describedby={describedBy}
        aria-label={props.label}
        className="invoice-visually-hidden"
        id={props.inputId}
        onChange={props.onChange}
        type="file"
      />
      <span className="invoice-upload-card__title" title={props.file?.name}>
        {title}
      </span>
      <span className="invoice-upload-card__constraints" id={constraintsId}>
        PDF до 15 Мб
      </span>
      {props.errorMessage ? (
        <span className="invoice-upload-card__error" id={errorId} role="alert">
          {props.errorMessage}
        </span>
      ) : null}
      <AddPlus
        aria-hidden="true"
        className="invoice-upload-card__plus"
        focusable="false"
      />
    </label>
  );
}
