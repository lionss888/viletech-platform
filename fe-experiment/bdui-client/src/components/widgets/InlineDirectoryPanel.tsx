import { FormEvent, useState } from 'react';
import { apiRequest } from '../../api/client';
import type { BduiAction, BduiField } from '../../types/bdui';
import { buildInlineCreateBody, readCreatedEntityId } from '../../utils/inline-directory';

type InlineDirectoryPanelProps = {
  action: BduiAction;
  panelTitle: string;
  isBusy?: boolean;
  onCreated: (entityId: string) => void;
  onError: (message: string) => void;
};

function parseApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ошибка сохранения';
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

function renderInlineField(
  field: BduiField,
  value: string,
  disabled: boolean,
  onChange: (name: string, next: string) => void,
): JSX.Element {
  if (field.fieldType === 'select') {
    return (
      <label key={field.name} className="bdui-field">
        <span>{field.label}</span>
        {field.hint ? <span className="bdui-field-hint">{field.hint}</span> : null}
        <select
          required={field.required}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          <option value="">—</option>
          {(field.options ?? []).map((option) => (
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
        type={field.fieldType === 'email' ? 'email' : field.fieldType === 'number' ? 'number' : 'text'}
        required={field.required}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </label>
  );
}

/**
 * Collapsible inline create form for directory entries (organization / counterparty).
 */
export function InlineDirectoryPanel(props: InlineDirectoryPanelProps): JSX.Element {
  const fields = props.action.requiresFormFields ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue;
      }
    }
    return initial;
  });

  function updateValue(name: string, next: string): void {
    setValues((previous) => ({ ...previous, [name]: next }));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!props.action.requiresFormFields?.length) {
      return;
    }
    setIsSubmitting(true);
    try {
      const body = buildInlineCreateBody(props.action, values);
      const response = await apiRequest<unknown>(props.action.path, {
        method: props.action.method,
        body,
      });
      const entityId = readCreatedEntityId(response);
      if (!entityId) {
        throw new Error('Create response missing id');
      }
      props.onCreated(entityId);
      setIsOpen(false);
    } catch (error) {
      props.onError(parseApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (fields.length === 0) {
    return <p className="bdui-muted">Inline create: fields missing in schema</p>;
  }

  return (
    <div className="bdui-inline-directory">
      <button
        type="button"
        className="bdui-inline-directory__toggle"
        disabled={props.isBusy || isSubmitting}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        {isOpen ? '−' : '+'} {props.panelTitle}
      </button>
      {isOpen ? (
        <form className="bdui-inline-directory__form" onSubmit={(event) => void handleSubmit(event)}>
          {fields.map((field) =>
            renderInlineField(field, values[field.name] ?? '', props.isBusy || isSubmitting, updateValue),
          )}
          <button type="submit" disabled={props.isBusy || isSubmitting}>
            {isSubmitting ? '…' : props.action.label}
          </button>
        </form>
      ) : null}
    </div>
  );
}
