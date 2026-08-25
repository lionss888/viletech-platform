import { useCallback, useEffect, useState } from 'react';
import { apiRequest, replacePathParams } from '../../api/client';
import type { BduiAction, BduiHttpMethod } from '../../types/bdui';
import { InlineDirectoryPanel } from './InlineDirectoryPanel';

type DirectoryRow = Record<string, unknown> & { _id?: string; name?: string; country?: string };

type InlineDirectoryWidgetProps = {
  widget: {
    title: string;
    description?: string;
    createActionId: string;
    listDataSource: { method: string; path: string };
    listIdField?: string;
    linkActionId?: string;
    linkBodyField: string;
  };
  actions: BduiAction[];
  formId: string;
  onLinked?: () => void;
};

function parseApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Ошибка';
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
 * Detail-page directory picker with inline create + PATCH link to form.
 */
export function InlineDirectoryWidget(props: InlineDirectoryWidgetProps): JSX.Element {
  const createAction = props.actions.find((action) => action.id === props.widget.createActionId);
  const linkAction = props.widget.linkActionId
    ? props.actions.find((action) => action.id === props.widget.linkActionId)
    : undefined;
  const idField = props.widget.listIdField ?? '_id';
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRows = useCallback(async (): Promise<void> => {
    const data = await apiRequest<{ docs?: DirectoryRow[]; items?: DirectoryRow[] } | DirectoryRow[]>(
      props.widget.listDataSource.path,
      { method: props.widget.listDataSource.method as BduiHttpMethod },
    );
    if (Array.isArray(data)) {
      setRows(data);
      return;
    }
    setRows(data.docs ?? data.items ?? []);
  }, [props.widget.listDataSource.method, props.widget.listDataSource.path]);

  useEffect(() => {
    void loadRows().catch((error) => {
      setErrorMessage(parseApiError(error));
    });
  }, [loadRows]);

  async function linkSelected(entityId: string): Promise<void> {
    if (!linkAction || !props.formId) {
      setSelectedId(entityId);
      setSuccessMessage('Запись создана — выберите её в списке.');
      return;
    }
    setIsBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiRequest(replacePathParams(linkAction.path, { formId: props.formId }), {
        method: linkAction.method,
        body: { [props.widget.linkBodyField]: entityId },
      });
      setSelectedId(entityId);
      setSuccessMessage('Контрагент привязан к заявке.');
      props.onLinked?.();
    } catch (error) {
      setErrorMessage(parseApiError(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLinkClick(): Promise<void> {
    if (!selectedId) {
      setErrorMessage('Выберите запись из списка.');
      return;
    }
    await linkSelected(selectedId);
  }

  if (!createAction) {
    return <p className="bdui-error">Inline create action missing: {props.widget.createActionId}</p>;
  }

  return (
    <section className="bdui-inline-directory-block">
      <h2 className="bdui-inline-directory-block__title">{props.widget.title}</h2>
      {props.widget.description ? <p className="bdui-muted">{props.widget.description}</p> : null}
      <label className="bdui-field">
        <span>Выбор из справочника</span>
        <select
          value={selectedId}
          disabled={isBusy}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          <option value="">—</option>
          {rows.map((row) => {
            const rowId = String(row[idField] ?? '');
            const label = [row.name, row.country].filter(Boolean).join(' · ');
            return (
              <option key={rowId} value={rowId}>
                {label || rowId}
              </option>
            );
          })}
        </select>
      </label>
      {linkAction ? (
        <button type="button" disabled={isBusy || !selectedId} onClick={() => void handleLinkClick()}>
          Привязать к заявке
        </button>
      ) : null}
      <InlineDirectoryPanel
        action={createAction}
        panelTitle="Добавить контрагента"
        isBusy={isBusy}
        onError={setErrorMessage}
        onCreated={(entityId) => {
          void loadRows()
            .then(() => linkSelected(entityId))
            .catch((error) => setErrorMessage(parseApiError(error)));
        }}
      />
      {errorMessage ? <p className="bdui-error">{errorMessage}</p> : null}
      {successMessage ? <p className="bdui-muted">{successMessage}</p> : null}
    </section>
  );
}
