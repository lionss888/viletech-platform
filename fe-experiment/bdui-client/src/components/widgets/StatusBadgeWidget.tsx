import { useEffect, useState } from 'react';
import type { BduiApiRef } from '../../types/bdui';
import { apiRequest, replacePathParams } from '../../api/client';

type StatusBadgeWidgetProps = {
  field: string;
  dataSource: BduiApiRef;
  formId: string;
  onStatusLoaded?: (status: string) => void;
};

export function StatusBadgeWidget(props: StatusBadgeWidgetProps): JSX.Element {
  const [status, setStatus] = useState<string>('…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onStatusLoaded = props.onStatusLoaded;

  useEffect(() => {
    let cancelled = false;
    async function loadStatus(): Promise<void> {
      try {
        const path = replacePathParams(props.dataSource.path, { formId: props.formId });
        const data = await apiRequest<Record<string, unknown>>(path, {
          method: props.dataSource.method,
        });
        if (cancelled) {
          return;
        }
        const value = data[props.field];
        const statusValue = value === undefined || value === null ? 'unknown' : String(value);
        setStatus(statusValue);
        onStatusLoaded?.(statusValue);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load status');
        }
      }
    }
    if (!props.formId) {
      return;
    }
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [props.dataSource.method, props.dataSource.path, props.field, props.formId, onStatusLoaded]);

  if (errorMessage) {
    return <p className="bdui-error">{errorMessage}</p>;
  }

  return <span className="bdui-badge">{status}</span>;
}
