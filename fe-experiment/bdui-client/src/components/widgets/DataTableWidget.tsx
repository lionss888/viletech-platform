import { useEffect, useMemo, useState } from 'react';
import type { BduiColumn, BduiApiRef, BduiTableSortDirection } from '../../types/bdui';
import { apiRequest } from '../../api/client';
import { formatFieldDisplay } from '../../utils/field-display';
import { sortTableRows } from '../../utils/table-sort';

type DataTableWidgetProps = {
  dataSource: BduiApiRef;
  columns: BduiColumn[];
  rowIdField?: string;
  onRowClick?: (rowId: string) => void;
  refreshKey?: string;
  defaultSort?: { key: string; direction: BduiTableSortDirection };
  sortableKeys?: string[];
  emptyMessage?: string;
};

type PaginatedRows = {
  docs?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
};

export function DataTableWidget(props: DataTableWidgetProps): JSX.Element {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState(props.defaultSort?.key ?? '');
  const [sortDirection, setSortDirection] = useState<BduiTableSortDirection>(
    props.defaultSort?.direction ?? 'desc',
  );

  useEffect(() => {
    if (props.defaultSort?.key) {
      setSortKey(props.defaultSort.key);
      setSortDirection(props.defaultSort.direction);
    }
  }, [props.defaultSort?.direction, props.defaultSort?.key]);

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
  }, [props.dataSource.method, props.dataSource.path, props.refreshKey]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows;
    }
    return sortTableRows(rows, sortKey, sortDirection);
  }, [rows, sortDirection, sortKey]);

  function handleSort(columnKey: string): void {
    const sortable = props.sortableKeys ?? [];
    if (!sortable.includes(columnKey)) {
      return;
    }
    if (sortKey === columnKey) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(columnKey);
    setSortDirection('desc');
  }

  if (isLoading) {
    return <p className="bdui-muted">Загрузка…</p>;
  }
  if (errorMessage) {
    return <p className="bdui-error">{errorMessage}</p>;
  }

  const idField = props.rowIdField ?? '_id';
  const sortableKeys = props.sortableKeys ?? [];
  const emptyText = props.emptyMessage ?? 'Нет заявок';

  return (
    <div className="bdui-table-wrap">
      <table className="bdui-table">
        <thead>
          <tr>
            {props.columns.map((column) => {
              const isSortable = sortableKeys.includes(column.key);
              const isActive = sortKey === column.key;
              return (
                <th key={column.key}>
                  {isSortable ? (
                    <button
                      type="button"
                      className={
                        isActive ? 'bdui-table-sort bdui-table-sort--active' : 'bdui-table-sort'
                      }
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      {isActive ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={props.columns.length} className="bdui-table-empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => {
              const rowId = String(row[idField] ?? index);
              return (
                <tr
                  key={rowId}
                  className={props.onRowClick ? 'bdui-row-clickable' : undefined}
                  onClick={() => props.onRowClick?.(rowId)}
                >
                  {props.columns.map((column) => (
                    <td key={column.key}>{formatFieldDisplay(row, column)}</td>
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
