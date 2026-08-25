import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import type {
  BduiAction,
  BduiBulkActionSpec,
  BduiColumn,
  BduiApiRef,
  BduiRowActionSpec,
  BduiTableFilter,
  BduiTableSortDirection,
} from '../../types/bdui';
import { apiRequest } from '../../api/client';
import { formatFieldDisplay, readNestedValue } from '../../utils/field-display';
import { isRowEligibleForBulk } from '../../utils/bulk-eligibility';
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
  selectable?: boolean;
  bulkActions?: BduiBulkActionSpec[];
  bulkMaxSelection?: number;
  filters?: BduiTableFilter[];
  rowActions?: BduiRowActionSpec[];
  rowActionColumnLabel?: string;
  actions?: BduiAction[];
  onBulkAction?: (
    spec: BduiBulkActionSpec,
    action: BduiAction,
    rows: Record<string, unknown>[],
    selectedIds: string[],
    idField: string,
    maxSelection: number,
  ) => Promise<string | null>;
  onRowAction?: (
    spec: BduiRowActionSpec,
    action: BduiAction,
    row: Record<string, unknown>,
    rowId: string,
  ) => Promise<string | null>;
};

type PaginatedRows = {
  docs?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
};

const DEFAULT_BULK_MAX = 20;

export function DataTableWidget(props: DataTableWidgetProps): JSX.Element {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isRowActionRunning, setIsRowActionRunning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState(props.defaultSort?.key ?? '');
  const [sortDirection, setSortDirection] = useState<BduiTableSortDirection>(
    props.defaultSort?.direction ?? 'desc',
  );

  const idField = props.rowIdField ?? '_id';
  const maxSelection = props.bulkMaxSelection ?? DEFAULT_BULK_MAX;
  const bulkSpecs = props.bulkActions ?? [];
  const isSelectable = props.selectable === true && bulkSpecs.length > 0;
  const rowActionSpecs = props.rowActions ?? [];
  const tableFilters = props.filters ?? [];
  const hasRowActions = rowActionSpecs.length > 0 && props.actions && props.onRowAction;

  useEffect(() => {
    if (props.defaultSort?.key) {
      setSortKey(props.defaultSort.key);
      setSortDirection(props.defaultSort.direction);
    }
  }, [props.defaultSort?.direction, props.defaultSort?.key]);

  useEffect(() => {
    setSelectedIds([]);
    setBulkFeedback(null);
    setFilterValues({});
  }, [props.refreshKey]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const filter of tableFilters) {
      initial[filter.id] = '';
    }
    setFilterValues(initial);
  }, [tableFilters]);

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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const filter of tableFilters) {
        const selected = filterValues[filter.id] ?? '';
        if (!selected) {
          continue;
        }
        const value = readNestedValue(row, filter.field);
        if (String(value ?? '') !== selected) {
          return false;
        }
      }
      return true;
    });
  }, [filterValues, rows, tableFilters]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return filteredRows;
    }
    return sortTableRows(filteredRows, sortKey, sortDirection);
  }, [filteredRows, sortDirection, sortKey]);

  const visibleIds = useMemo(
    () => sortedRows.map((row, index) => String(row[idField] ?? index)),
    [idField, sortedRows],
  );

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

  function toggleRow(rowId: string): void {
    setSelectedIds((previous) => {
      if (previous.includes(rowId)) {
        return previous.filter((id) => id !== rowId);
      }
      if (previous.length >= maxSelection) {
        setBulkFeedback(`Максимум ${maxSelection} строк в одном пакете.`);
        return previous;
      }
      setBulkFeedback(null);
      return [...previous, rowId];
    });
  }

  function toggleAllVisible(): void {
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((previous) => previous.filter((id) => !visibleIds.includes(id)));
      return;
    }
    const merged = [...selectedIds];
    for (const id of visibleIds) {
      if (merged.length >= maxSelection) {
        break;
      }
      if (!merged.includes(id)) {
        merged.push(id);
      }
    }
    setSelectedIds(merged);
  }

  async function handleBulkClick(spec: BduiBulkActionSpec): Promise<void> {
    if (!props.onBulkAction || !props.actions) {
      return;
    }
    const action = props.actions.find((item) => item.id === spec.actionId);
    if (!action) {
      setBulkFeedback(`Action missing: ${spec.actionId}`);
      return;
    }
    setIsBulkRunning(true);
    setBulkFeedback(null);
    try {
      const message = await props.onBulkAction(
        spec,
        action,
        rows,
        selectedIds,
        idField,
        maxSelection,
      );
      if (message) {
        setBulkFeedback(message);
      }
      setSelectedIds([]);
    } catch (error) {
      setBulkFeedback(error instanceof Error ? error.message : 'Bulk action failed');
    } finally {
      setIsBulkRunning(false);
    }
  }

  function findRowActionForRow(row: Record<string, unknown>): {
    spec: BduiRowActionSpec;
    action: BduiAction;
  } | null {
    if (!props.actions) {
      return null;
    }
    for (const spec of rowActionSpecs) {
      if (!isRowEligibleForBulk(row, spec.eligibility)) {
        continue;
      }
      const action = props.actions.find((item) => item.id === spec.actionId);
      if (action) {
        return { spec, action };
      }
    }
    return null;
  }

  async function handleRowActionClick(
    event: MouseEvent,
    spec: BduiRowActionSpec,
    action: BduiAction,
    row: Record<string, unknown>,
    rowId: string,
  ): Promise<void> {
    event.stopPropagation();
    if (!props.onRowAction) {
      return;
    }
    setIsRowActionRunning(true);
    setBulkFeedback(null);
    try {
      const message = await props.onRowAction(spec, action, row, rowId);
      if (message) {
        setBulkFeedback(message);
      }
    } catch (error) {
      setBulkFeedback(error instanceof Error ? error.message : 'Row action failed');
    } finally {
      setIsRowActionRunning(false);
    }
  }

  if (isLoading) {
    return <p className="bdui-muted">Загрузка…</p>;
  }
  if (errorMessage) {
    return <p className="bdui-error">{errorMessage}</p>;
  }

  const sortableKeys = props.sortableKeys ?? [];
  const emptyText = props.emptyMessage ?? 'Нет заявок';
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const extraColumns = (isSelectable ? 1 : 0) + (hasRowActions ? 1 : 0);
  const rowActionLabel = props.rowActionColumnLabel ?? 'Действие';

  return (
    <div className="bdui-table-wrap">
      {tableFilters.length > 0 ? (
        <div className="bdui-table-filters" role="search" aria-label="Фильтры списка">
          {tableFilters.map((filter) => (
            <label key={filter.id} className="bdui-table-filter">
              <span className="bdui-table-filter__label">{filter.label}</span>
              <select
                value={filterValues[filter.id] ?? ''}
                onChange={(event) =>
                  setFilterValues((previous) => ({
                    ...previous,
                    [filter.id]: event.target.value,
                  }))
                }
              >
                {filter.options.map((option) => (
                  <option key={option.value || '__all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {tableFilters.some((filter) => filterValues[filter.id]) ? (
            <span className="bdui-muted bdui-table-filter__count">
              Показано: {sortedRows.length} из {rows.length}
            </span>
          ) : null}
        </div>
      ) : null}
      {isSelectable && selectedIds.length > 0 ? (
        <div className="bdui-bulk-bar" role="region" aria-label="Пакетные действия">
          <span className="bdui-muted">
            Выбрано: {selectedIds.length} (макс. {maxSelection})
          </span>
          {bulkSpecs.map((spec) => (
            <button
              key={spec.actionId}
              type="button"
              disabled={isBulkRunning}
              onClick={() => void handleBulkClick(spec)}
            >
              {isBulkRunning ? '…' : spec.label}
            </button>
          ))}
          <button type="button" className="bdui-bulk-bar__clear" disabled={isBulkRunning} onClick={() => setSelectedIds([])}>
            Снять выбор
          </button>
        </div>
      ) : null}
      {bulkFeedback ? <p className="bdui-muted bdui-bulk-feedback">{bulkFeedback}</p> : null}
      <table className="bdui-table">
        <thead>
          <tr>
            {isSelectable ? (
              <th className="bdui-table-select-col">
                <input
                  type="checkbox"
                  aria-label="Выбрать все на странице"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                />
              </th>
            ) : null}
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
            {hasRowActions ? <th className="bdui-table-row-action-col">{rowActionLabel}</th> : null}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={props.columns.length + extraColumns} className="bdui-table-empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => {
              const rowId = String(row[idField] ?? index);
              const isSelected = selectedIds.includes(rowId);
              const rowAction = findRowActionForRow(row);
              return (
                <tr
                  key={rowId}
                  className={props.onRowClick ? 'bdui-row-clickable' : undefined}
                  onClick={() => props.onRowClick?.(rowId)}
                >
                  {isSelectable ? (
                    <td
                      className="bdui-table-select-col"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Выбрать строку ${rowId.slice(-6)}`}
                        checked={isSelected}
                        onChange={() => toggleRow(rowId)}
                      />
                    </td>
                  ) : null}
                  {props.columns.map((column) => (
                    <td key={column.key}>{formatFieldDisplay(row, column)}</td>
                  ))}
                  {hasRowActions ? (
                    <td
                      className="bdui-table-row-action-col"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {rowAction ? (
                        <button
                          type="button"
                          className="bdui-row-action-btn"
                          disabled={isRowActionRunning || isBulkRunning}
                          onClick={(event) =>
                            void handleRowActionClick(event, rowAction.spec, rowAction.action, row, rowId)
                          }
                        >
                          {isRowActionRunning ? '…' : rowAction.spec.label ?? rowAction.action.label}
                        </button>
                      ) : (
                        <span className="bdui-muted">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
