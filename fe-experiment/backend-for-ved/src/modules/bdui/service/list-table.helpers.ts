import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import {
  BDUI_ACTION_ACCEPT_FORM,
  BDUI_ACTION_ECO_START,
  BDUI_ACTION_ICO_START,
  BDUI_ACTION_MGR_ORDER_START,
  BDUI_ACTION_PROV_PAYMENT_START,
  BDUI_ROLE_EXTERNAL_CO,
  BDUI_ROLE_INTERNAL_CO,
  BDUI_ROLE_MANAGER,
  BDUI_ROLE_PROVIDER,
  BDUI_ROLE_USER,
  BduiVedRoleId,
} from '../bdui.constants';
import { BduiAction, BduiDataTableWidget, BduiRowActionSpec, BduiTableFilter } from '../bdui.types';
import { getCatalogActions } from './lifecycle-action.catalog';

export const FORM_LIST_PATH_PARAM = 'formId';

type StatusOption = { value: string; label: string };

function statusOption(value: FormPaymentStatus | string, label: string): StatusOption {
  return { value, label };
}

function buildStatusFilter(id: string, options: StatusOption[]): BduiTableFilter {
  return {
    id,
    field: 'status',
    label: 'Статус',
    mode: 'client',
    options: [{ value: '', label: 'Все' }, ...options],
  };
}

const USER_STATUS_OPTIONS: StatusOption[] = [
  statusOption(FormPaymentStatus.CREATING, 'Создание'),
  statusOption(FormPaymentStatus.DRAFT, 'Черновик'),
  statusOption(FormPaymentStatus.FORM_WAITING_CORRECTIONS, 'На доработке'),
  statusOption(FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION, 'Ожидает проверки орг.'),
  statusOption(FormPaymentStatus.FORM_WAITING_VERIFICATION, 'Ожидает проверки'),
  statusOption(FormPaymentStatus.CONTRACT_WAITING, 'Ожидает договор'),
  statusOption(FormPaymentStatus.SIGNING_ORDER, 'Поручение на подпись'),
  statusOption(FormPaymentStatus.COMPLETED, 'Завершена'),
  statusOption(FormPaymentStatus.CANCELED_BY_USER, 'Отменена'),
];

const ICO_STATUS_OPTIONS: StatusOption[] = [
  statusOption(FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION, 'Ожидает взятия'),
  statusOption(FormPaymentStatus.ORGANIZATION_VERIFICATION, 'В проверке'),
];

const ECO_STATUS_OPTIONS: StatusOption[] = [
  statusOption(FormPaymentStatus.FORM_WAITING_VERIFICATION, 'Ожидает взятия'),
  statusOption(FormPaymentStatus.FORM_VERIFICATION, 'В проверке'),
];

const MANAGER_STATUS_OPTIONS: StatusOption[] = [
  statusOption(FormPaymentStatus.FORM_ACCEPTED, 'Одобрена'),
  statusOption(FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION, 'Поручение ожидает'),
  statusOption(FormPaymentStatus.SIGNING_ORDER_VERIFICATION, 'Проверка поручения'),
  statusOption(FormPaymentStatus.PAYMENT_RECEIVED, 'Оплата получена'),
  statusOption(FormPaymentStatus.PAYMENT_PROCESSING, 'Исполнение'),
  statusOption(FormPaymentStatus.REPORT_WAITING_VERIFICATION, 'Отчёт ожидает'),
  statusOption(FormPaymentStatus.SHIPMENT_WAITING_VERIFICATION, 'Отгрузка ожидает'),
];

const PROVIDER_STATUS_OPTIONS: StatusOption[] = [
  statusOption(FormPaymentStatus.SIGNING_ORDER_ACCEPTED, 'Поручение принято'),
  statusOption(FormPaymentStatus.PAYMENT_RECEIVED, 'Оплата получена'),
  statusOption(FormPaymentStatus.PAYMENT_PROCESSING, 'В исполнении'),
];

/**
 * Client-side status filter options per role queue.
 */
export function listStatusFilterForRole(role: BduiVedRoleId): BduiTableFilter | undefined {
  switch (role) {
    case BDUI_ROLE_USER:
      return buildStatusFilter('user_status', USER_STATUS_OPTIONS);
    case BDUI_ROLE_INTERNAL_CO:
      return buildStatusFilter('ico_status', ICO_STATUS_OPTIONS);
    case BDUI_ROLE_EXTERNAL_CO:
      return buildStatusFilter('eco_status', ECO_STATUS_OPTIONS);
    case BDUI_ROLE_MANAGER:
      return buildStatusFilter('mgr_status', MANAGER_STATUS_OPTIONS);
    case BDUI_ROLE_PROVIDER:
      return buildStatusFilter('prov_status', PROVIDER_STATUS_OPTIONS);
    default:
      return undefined;
  }
}

/**
 * Primary list-safe row CTA from lifecycle matrix (start / submit without files).
 */
export function listRowActionsForRole(role: BduiVedRoleId): BduiRowActionSpec[] {
  switch (role) {
    case BDUI_ROLE_USER:
      return [
        {
          actionId: BDUI_ACTION_ACCEPT_FORM,
          pathParam: FORM_LIST_PATH_PARAM,
          eligibility: {
            field: 'status',
            in: [FormPaymentStatus.DRAFT, FormPaymentStatus.CREATING],
          },
          requiresConfirmation: true,
        },
      ];
    case BDUI_ROLE_INTERNAL_CO:
      return [
        {
          actionId: BDUI_ACTION_ICO_START,
          pathParam: FORM_LIST_PATH_PARAM,
          eligibility: {
            field: 'status',
            in: [FormPaymentStatus.ORGANIZATION_WAITING_VERIFICATION],
          },
        },
      ];
    case BDUI_ROLE_EXTERNAL_CO:
      return [
        {
          actionId: BDUI_ACTION_ECO_START,
          pathParam: FORM_LIST_PATH_PARAM,
          eligibility: {
            field: 'status',
            in: [FormPaymentStatus.FORM_WAITING_VERIFICATION],
          },
        },
      ];
    case BDUI_ROLE_MANAGER:
      return [
        {
          actionId: BDUI_ACTION_MGR_ORDER_START,
          pathParam: FORM_LIST_PATH_PARAM,
          eligibility: {
            field: 'status',
            in: [FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION],
          },
        },
      ];
    case BDUI_ROLE_PROVIDER:
      return [
        {
          actionId: BDUI_ACTION_PROV_PAYMENT_START,
          pathParam: FORM_LIST_PATH_PARAM,
          eligibility: {
            field: 'status',
            in: [FormPaymentStatus.SIGNING_ORDER_ACCEPTED, FormPaymentStatus.PAYMENT_RECEIVED],
          },
        },
      ];
    default:
      return [];
  }
}

/**
 * Resolves catalog descriptors for list row actions.
 */
export function resolveListActionDescriptors(rowActions: BduiRowActionSpec[]): BduiAction[] {
  if (rowActions.length === 0) {
    return [];
  }
  return getCatalogActions(rowActions.map((item) => item.actionId));
}

export type EnrichedFormListTable = {
  table: BduiDataTableWidget;
  listActions: BduiAction[];
};

/**
 * Adds E14 filters + row actions to a forms list data_table widget.
 */
export function enrichFormListTable(table: BduiDataTableWidget, role: BduiVedRoleId): EnrichedFormListTable {
  const rowActions = listRowActionsForRole(role);
  const statusFilter = listStatusFilterForRole(role);
  const filters: BduiTableFilter[] = statusFilter ? [statusFilter] : [];
  return {
    table: {
      ...table,
      filters: filters.length > 0 ? filters : undefined,
      rowActions: rowActions.length > 0 ? rowActions : undefined,
      rowActionColumnLabel: 'Действие',
    },
    listActions: resolveListActionDescriptors(rowActions),
  };
}
