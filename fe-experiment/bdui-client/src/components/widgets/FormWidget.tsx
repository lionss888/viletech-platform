import { FormEvent, useState } from 'react';
import type { BduiAction, BduiField } from '../../types/bdui';

type FormWidgetProps = {
  fields: BduiField[];
  submitAction: BduiAction;
  onSubmit: (action: BduiAction, body: Record<string, string>) => Promise<void>;
};

export function FormWidget(props: FormWidgetProps): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField(name: string, value: string): void {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const body: Record<string, string> = {};
      for (const field of props.fields) {
        const value = values[field.name];
        if (value !== undefined && value !== '') {
          body[field.name] = value;
        }
      }
      await props.onSubmit(props.submitAction, body);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="bdui-form" onSubmit={handleSubmit}>
      {props.fields.map((field) => (
        <label key={field.name}>
          {field.label}
          {field.fieldType === 'select' ? (
            <select
              name={field.name}
              value={values[field.name] ?? ''}
              required={field.required}
              onChange={(event) => updateField(field.name, event.target.value)}
            >
              <option value="">—</option>
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.fieldType}
              name={field.name}
              value={values[field.name] ?? ''}
              required={field.required}
              onChange={(event) => updateField(field.name, event.target.value)}
            />
          )}
        </label>
      ))}
      {errorMessage ? <p className="bdui-error">{errorMessage}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '…' : props.submitAction.label}
      </button>
    </form>
  );
}
