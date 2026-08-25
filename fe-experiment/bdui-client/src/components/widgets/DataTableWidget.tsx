import { useEffect, useState } from 'react';
import type { BduiColumn, BduiApiRef } from '../../types/bdui';
import { apiRequest } from '../../api/client';

type DataTableWidgetProps = {
  dataSource: BduiApiRef;
  columns: BduiColumn[];
  rowIdField?: string;
  onRowClick?: (rowId: string) => void;
};

type PaginatedRows = {
  docs?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
};

function readCell(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function DataTableWidget(props: DataTableWidgetProps): JSX.Element {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadRows(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await apiRequest<PaginatedRows | Record<string, unknown>[]>(props.dataSource.path, {
          method: props.dataSource.method,
        });
        if (cancelled) {
          return;
        }
        if (Array.isArray(data)) {
          setRows(data);
        } else {
          setRows(data.docs ?? data.items ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load table');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadRows();
    return () => {
      cancelled = true;
    };
  }, [props.dataSource.method, props.dataSource.path]);

  if (isLoading) {
    return <p className="bdui-muted">Загрузка…</p>;
  }
  if (errorMessage) {
    return <p className="bdui-error">{errorMessage}</p>;
  }

  const idField = props.rowIdField ?? '_id';

  return (
    <div className="bdui-table-wrap">
      <table className="bdui-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={props.columns.length}>Нет заявок</td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const rowId = String(row[idField] ?? index);
              return (
                <tr
                  key={rowId}
                  className={props.onRowClick ? 'bdui-row-clickable' : undefined}
                  onClick={() => props.onRowClick?.(rowId)}
                >
                  {props.columns.map((column) => (
                    <td key={column.key}>{readCell(row, column.key)}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
