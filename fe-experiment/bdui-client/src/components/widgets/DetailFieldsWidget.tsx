import { useEffect, useState } from 'react';
import type { BduiApiRef, BduiColumn } from '../../types/bdui';
import { apiRequest, replacePathParams } from '../../api/client';
import { formatFieldDisplay } from '../../utils/field-display';

type DetailFieldsWidgetProps = {
  dataSource: BduiApiRef;
  fields: BduiColumn[];
  formId: string;
  /** Bump to reload after CTA / status change. */
  refreshKey?: string;
};

export function DetailFieldsWidget(props: DetailFieldsWidgetProps): JSX.Element {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDetail(): Promise<void> {
      try {
        const path = replacePathParams(props.dataSource.path, { formId: props.formId });
        const response = await apiRequest<Record<string, unknown>>(path, {
          method: props.dataSource.method,
        });
        if (!cancelled) {
          setData(response);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load detail');
        }
      }
    }
    if (!props.formId) {
      return;
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [props.dataSource.method, props.dataSource.path, props.formId, props.refreshKey]);

  if (errorMessage) {
    return <p className="bdui-error">{errorMessage}</p>;
  }
  if (!data) {
    return <p className="bdui-muted">Загрузка…</p>;
  }

  return (
    <dl className="bdui-detail">
      {props.fields.map((field) => (
        <div key={field.key} className="bdui-detail-row">
          <dt>{field.label}</dt>
          <dd>{formatFieldDisplay(data, field)}</dd>
        </div>
      ))}
    </dl>
  );
}
